/**
 * APEX PhysiOmni Retrofit Puck - Secure Edge Firmware
 * Hardware: nRF9161-DK, ADXL345 Accelerometer (I2C)
 * Platform: Zephyr RTOS, nRF Connect SDK v2.x
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/sensor.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/pm/device.h>
#include <zephyr/pm/pm.h>
#include <zephyr/net/socket.h>
#include <zephyr/net/http/client.h>
#include <zephyr/data/json.h>
#include <nrf_modem_at.h>
#include <stdio.h>
#include <string.h>

#define OMNIPORT_HOST "omniport.apex.systems"
#define OMNIPORT_PORT 443
#define OMNIPORT_PATH "/api/v1/telemetry/ingest"

/* Security: Predefined modem secure tag where provisioning certs reside */
#define AEGIS_SEC_TAG 16842

/* Sleep duration: 15 minutes (900,000 milliseconds) */
#define DEEP_SLEEP_MS 900000

/* Pull tenant ID from Kconfig Kconfig-defined values or prj.conf */
#ifndef CONFIG_PHYSIOMNI_TENANT_ID
#define CONFIG_PHYSIOMNI_TENANT_ID "4b2f3a8b-1e7c-4c91-923f-5d02a895226c"
#endif

/* ── 1. JSON PAYLOAD SERIALIZATION DEFINITION ──────────────────────────────── */
struct telemetry_payload {
	const char *device_serial;
	const char *tenant_id;
	double vibration_x;
	double vibration_y;
	double vibration_z;
	double temperature_c;
	const char *timestamp;
};

static const struct json_obj_descr telemetry_descr[] = {
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, device_serial, JSON_TOK_STRING),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, tenant_id, JSON_TOK_STRING),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, vibration_x, JSON_TOK_NUMBER),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, vibration_y, JSON_TOK_NUMBER),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, vibration_z, JSON_TOK_NUMBER),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, temperature_c, JSON_TOK_NUMBER),
	JSON_OBJ_DESCR_PRIM(struct telemetry_payload, timestamp, JSON_TOK_STRING),
};

/**
 * Retrieve the physical modem IMEI programmatically to use as device_serial.
 */
static int get_modem_imei(char *bufval, size_t len)
{
	int err = nrf_modem_at_scanf("AT+CGSN", "%s", bufval);
	if (err < 0) {
		printk("AegisKernel: Failed to read IMEI AT command. Falling back to default ID.\n");
		snprintf(bufval, len, "DEV-NRF9161-FALLBACK");
		return err;
	}
	return 0;
}

/**
 * HTTP Client Response callback.
 */
static void http_response_cb(struct http_response *rsp,
			     enum http_reaction reaction,
			     void *user_data)
{
	if (rsp->data_len > 0) {
		printk("OmniPort backhaul response: %s\n", rsp->recv_bufval);
	}
}

/**
 * Dispatch HTTPS POST using mTLS offloaded secure sockets.
 */
static int dispatch_mtls_telemetry(const char *payload)
{
	int sock;
	int err;
	struct sockaddr_in remote_addr;
	struct addrinfo hints = {
		.ai_family = AF_INET,
		.ai_socktype = SOCK_STREAM,
	};
	struct addrinfo *res;

	/* Resolve target OmniPort host name */
	err = getaddrinfo(OMNIPORT_HOST, NULL, &hints, &res);
	if (err) {
		printk("AegisKernel: DNS host resolution failed: %d\n", err);
		return err;
	}

	/* Create offloaded TLS socket */
	sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TLS_1_2);
	if (sock < 0) {
		printk("AegisKernel: Secure socket creation failed: %d\n", errno);
		freeaddrinfo(res);
		return -errno;
	}

	/* Map to the predefined secure tag containing mTLS credentials in modem secure element */
	sec_tag_t sec_tag_list[] = { AEGIS_SEC_TAG };
	err = setsockopt(sock, SOL_TLS, TLS_SEC_TAG_LIST, sec_tag_list, sizeof(sec_tag_list));
	if (err) {
		printk("AegisKernel: Failed to bind secure tag %d: %d\n", AEGIS_SEC_TAG, errno);
		close(sock);
		freeaddrinfo(res);
		return -errno;
	}

	/* Connect secure stream */
	((struct sockaddr_in *)res->ai_addr)->sin_port = htons(OMNIPORT_PORT);
	err = connect(sock, res->ai_addr, sizeof(struct sockaddr_in));
	if (err) {
		printk("AegisKernel: HTTPS Connection failed: %d\n", errno);
		close(sock);
		freeaddrinfo(res);
		return -errno;
	}

	/* Prepare HTTP POST client request envelope */
	struct http_request req = {
		.method = HTTP_POST,
		.host = OMNIPORT_HOST,
		.port = "443",
		.url = OMNIPORT_PATH,
		.response = http_response_cb,
		.recv_bufval = NULL,
		.recv_bufval_len = 0,
		.payload = payload,
		.payload_len = strlen(payload),
	};

	err = http_client_req(sock, &req, 30000, NULL);
	if (err < 0) {
		printk("AegisKernel: HTTPS POST failed: %d\n", err);
	} else {
		printk("AegisKernel: Telemetry successfully ingested by OmniPort.\n");
	}

	close(sock);
	freeaddrinfo(res);
	return err;
}

int main(void)
{
	printk("Initializing PhysiOmni Puck Core Board...\n");

	char imei[32] = {0};
	get_modem_imei(imei, sizeof(imei));
	printk("Device serial derived from modem IMEI: %s\n", imei);

	/* Fetch ADXL345 sensor instance from Zephyr device tree */
	const struct device *const sensor_dev = DEVICE_DT_GET_ANY(adi_adxl345);
	if (!device_is_ready(sensor_dev)) {
		printk("AegisKernel: ADXL345 accelerometer is not ready!\n");
		return 0;
	}

	while (1) {
		/* Step 1: Read and scale accelerometer vibration */
		struct sensor_value accel[3];
		int err = sensor_sample_fetch(sensor_dev);
		if (err) {
			printk("Error fetching sensor reading: %d\n", err);
			continue;
		}

		sensor_channel_get(sensor_dev, SENSOR_CHAN_ACCEL_XYZ, accel);

		double x_g = sensor_value_to_double(&accel[0]);
		double y_g = sensor_value_to_double(&accel[1]);
		double z_g = sensor_value_to_double(&accel[2]);
		
		/* Mock raw internal temperature reading for thermal safety audit */
		double temp_c = 24.5; 

		/* Step 2: Build timestamp string from uptime ticks */
		char timestamp_bufval[32];
		int64_t uptime_ms = k_uptime_get();
		snprintf(timestamp_bufval, sizeof(timestamp_bufval), 
			 "2026-05-26T23:38:37.%03dZ", (int)(uptime_ms % 1000));

		/* Step 3: Serialize payload utilizing native Zephyr json library */
		struct telemetry_payload payload = {
			.device_serial = imei,
			.tenant_id = CONFIG_PHYSIOMNI_TENANT_ID,
			.vibration_x = x_g,
			.vibration_y = y_g,
			.vibration_z = z_g,
			.temperature_c = temp_c,
			.timestamp = timestamp_bufval,
		};

		char json_buffer[384];
		err = json_obj_encode_buf(telemetry_descr, ARRAY_SIZE(telemetry_descr), 
					  &payload, json_buffer, sizeof(json_buffer));
		if (err < 0) {
			printk("Failed to encode telemetry JSON: %d\n", err);
			continue;
		}

		printk("Raw JSON payload:\n%s\n", json_buffer);

		/* Step 4: Securely transmit telemetry via offloaded mTLS */
		dispatch_mtls_telemetry(json_buffer);

		/* Step 5: AegisKernel Power Loop - Force ultra low power state */
		printk("Puck entering low-power deep sleep mode (15 min)...\n");

		/* Suspend accelerometer hardware over I2C */
		pm_device_action_run(sensor_dev, PM_DEVICE_ACTION_SUSPEND);

		/* Force the Zephyr PM subsystem state. Utilizing SUSPEND_TO_RAM or STANDBY.
		 * Under tickless idle, the OS will put CPU to sleep for the duration of the sleep.
		 */
		struct pm_state_info sleep_state = {
			.state = PM_STATE_STANDBY,
			.substate_id = 0,
		};
		pm_state_force(0, &sleep_state);

		/* sleep deterministically. Tickless kernel switches off offloaded blocks */
		k_sleep(K_MSEC(DEEP_SLEEP_MS));

		/* Wakeup & resume peripherals */
		printk("Waking up edge puck. Restoring systems...\n");
		pm_device_action_run(sensor_dev, PM_DEVICE_ACTION_RESUME);
	}

	return 0;
}
