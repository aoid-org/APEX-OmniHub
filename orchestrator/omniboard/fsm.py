import logging
import uuid
from datetime import UTC, datetime

from .schema import (
    AuditContext,
    AuthType,
    ConnectionDetails,
    ConnectionSpec,
    FSMContext,
    FSMEvent,
    OmniBoardState,
    SecurityContext,
    TriforceTier,
    VerificationMethod,
)
from .service import OmniBoardService

logger = logging.getLogger(__name__)


class OmniBoardFSM:
    """
    Deterministic Finite State Machine for OmniBoard.

    Enforces the following flow:
    IDLE_LISTEN -> APP_IDENTIFICATION -> AUTH_SETUP -> AUTH_COMPLETE ->
    VERIFY_CONNECTION -> REGISTER_CONNECTION -> COMPLETION

    With recovery paths:
    * -> RECOVERY_RETRY -> (Back to previous state)
    """

    @staticmethod
    def start_session(tenant_id: str, trace_id: str) -> FSMContext:
        """Initialize a new FSM session."""
        return FSMContext(
            session_id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            state=OmniBoardState.IDLE_LISTEN,
            trace_id=trace_id,
        )

    @classmethod
    def transition(cls, context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        """
        Execute a state transition based on the current state and input event.
        Returns: (Updated Context, User/System Response Message)
        """
        logger.info(f"FSM Transition: {context.state} + {event.event_type} -> ...")

        try:
            # 1. IDLE_LISTEN -> APP_IDENTIFICATION
            if context.state == OmniBoardState.IDLE_LISTEN:
                return cls._handle_idle_listen(context, event)

            # 2. APP_IDENTIFICATION -> AUTH_SETUP
            if context.state == OmniBoardState.APP_IDENTIFICATION:
                return cls._handle_app_identification(context, event)

            # 2b. APP_DISAMBIGUATION -> AUTH_SETUP
            if context.state == OmniBoardState.APP_DISAMBIGUATION:
                return cls._handle_app_disambiguation(context, event)

            # 3. AUTH_SETUP -> AUTH_COMPLETE
            if context.state == OmniBoardState.AUTH_SETUP:
                return cls._handle_auth_setup(context, event)

            # 4. AUTH_COMPLETE -> VERIFY_CONNECTION
            if context.state == OmniBoardState.AUTH_COMPLETE:
                # This state is usually auto-transitioned, but wait for explicit trigger if async
                return cls._handle_auth_complete(context, event)

            # 5. VERIFY_CONNECTION -> REGISTER_CONNECTION
            if context.state == OmniBoardState.VERIFY_CONNECTION:
                return cls._handle_verify_connection(context, event)

            # 6. REGISTER_CONNECTION -> COMPLETION
            if context.state == OmniBoardState.REGISTER_CONNECTION:
                return cls._handle_register_connection(context, event)

            # 7. RECOVERY_RETRY logic
            if context.state == OmniBoardState.RECOVERY_RETRY:
                return cls._handle_recovery(context, event)

            # Default: No transition possible
            return context, "I didn't understand that. Please wait or try again."

        except Exception as e:
            logger.error(f"FSM Error: {str(e)}", exc_info=True)
            # Transition to RECOVERY_RETRY on error
            context.state = OmniBoardState.RECOVERY_RETRY
            return context, "Something went wrong. Let's try that step again."

    # --- State Handlers ---

    @staticmethod
    def _handle_idle_listen(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        user_input = event.payload.get("user_input", "").strip()
        if not user_input:
            return context, "I'm ready to connect a new app. Which app would you like to connect?"

        # In a real implementation, we would extract the app name here or in the Service layer.
        context.state = OmniBoardState.APP_IDENTIFICATION

        # Optimistic: If the input looks like an app name, store it as a hint.
        context.provider_hint = user_input

        return context, f"Searching for '{user_input}'..."

    @staticmethod
    def _handle_app_identification(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Input: Confirmation or Refinement of the app name
        match_found = event.payload.get("match_found", False)
        provider_name = event.payload.get("provider_name")
        candidates = event.payload.get("candidates", [])

        if match_found and provider_name:
            context.provider_name = provider_name
            context.state = OmniBoardState.AUTH_SETUP
            return (
                context,
                f"Found {provider_name}. How would you like to connect? "
                "(OAuth, API Key, or Device Code)",
            )

        if candidates:
            context.candidates = candidates
            context.state = OmniBoardState.APP_DISAMBIGUATION
            options = ", ".join(candidates)
            return context, f"Did you mean one of these: {options}?"

        return context, "I couldn't find that app. Could you spell it exactly?"

    @staticmethod
    def _handle_app_disambiguation(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Input: User selects one of the candidates
        user_selection = event.payload.get("user_input", "").strip()
        # Log selection for debug, even if we assume matched event
        logger.debug(f"User selection: {user_selection}")

        # Check if selection matches a candidate
        # For simplicity, strict match or logic handled by external matcher again
        # Assume external matcher processed selection and returned match_found=True
        match_found = event.payload.get("match_found", False)
        provider_name = event.payload.get("provider_name")

        if match_found and provider_name:
            context.provider_name = provider_name
            context.state = OmniBoardState.AUTH_SETUP
            return (
                context,
                f"Found {provider_name}. How would you like to connect? "
                "(OAuth, API Key, or Device Code)",
            )

        return context, "Please select one of the options or try searching again."

    @staticmethod
    def _handle_auth_setup(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Input: User selects auth method or provides keys
        auth_method = event.payload.get("auth_method")

        if auth_method in [t.value for t in AuthType]:
            context.auth_type = AuthType(auth_method)
            context.state = OmniBoardState.AUTH_COMPLETE
            if context.auth_type == AuthType.OAUTH:
                auth_url = OmniBoardService.generate_oauth_url(
                    context.provider_name or "unknown", context.tenant_id
                )
                return context, f"Please click this link to authorize: {auth_url}"
            if context.auth_type == AuthType.API_KEY:
                return context, "Please enter your API Key."
            if context.auth_type == AuthType.DEVICE_CODE:
                device_data = OmniBoardService.initiate_device_code_flow(
                    context.provider_name or "unknown"
                )
                code = device_data["user_code"]
                uri = device_data["verification_uri"]
                return context, f"Please visit {uri} and enter code: {code}"

            return context, "Proceeding with authentication..."

        return (
            context,
            "Please select a valid authentication method: OAuth, API Key, or Device Code.",
        )

    @staticmethod
    def _handle_auth_complete(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Triggered when auth is done (callback received or key entered)
        _ = event
        context.state = OmniBoardState.VERIFY_CONNECTION
        return context, "Authentication received. Verifying connection..."

    @staticmethod
    def _handle_verify_connection(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Input: Result of the verification attempt
        verified = event.payload.get("verified", False)

        if verified:
            context.state = OmniBoardState.REGISTER_CONNECTION
            return context, "Connection verified! Registering..."

        context.retry_count += 1
        if context.retry_count > 3:
            context.state = OmniBoardState.RECOVERY_RETRY
            return context, "Verification failed multiple times. Let's start over."

        # Stay in verify or go back to auth? Usually back to Auth if credentials are bad.
        context.state = OmniBoardState.AUTH_SETUP
        return context, "Verification failed. Please check your credentials and try again."

    @staticmethod
    def _handle_register_connection(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Input: Registration success
        connection_id = event.payload.get("connection_id")

        # DEBUG
        t_ref = f"vault://{context.tenant_id}/{context.provider_name}"
        print(f"DEBUG: token_ref={t_ref}")

        # CREATE FINAL SPEC
        connection = ConnectionDetails(
            connection_id=connection_id or ConnectionDetails.generate_id(),
            provider_name=context.provider_name or "unknown",
            provider_hint=context.provider_hint or "unknown",
            match_confidence=1.0,
            auth_type=context.auth_type or AuthType.API_KEY,  # Default fallback
            token_ref=t_ref,
            verified=True,
            verification_method=VerificationMethod.SAFE_PING,
            connected_at=datetime.now(UTC).isoformat(),
        )

        spec = ConnectionSpec(
            tenant_id=context.tenant_id,
            connection=connection,
            security=SecurityContext(
                guardian_profile="default",
                triforce_tier=TriforceTier.STANDARD,
                risk_flags=[],
            ),
            audit=AuditContext(
                trace_id=context.trace_id,
                created_at=datetime.now(UTC).isoformat(),
            ),
        )

        context.final_spec = spec
        context.state = OmniBoardState.COMPLETION
        return context, f"Done. {context.provider_name} is now connected."

    @staticmethod
    def _handle_recovery(context: FSMContext, event: FSMEvent) -> tuple[FSMContext, str]:
        # Reset relative to severity
        _ = event
        context.state = OmniBoardState.IDLE_LISTEN
        context.retry_count = 0
        return context, "I've reset the session. Which app would you like to connect?"
