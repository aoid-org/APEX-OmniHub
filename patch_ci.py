import sys

with open('.github/workflows/ci-runtime-gates.yml', 'r') as f:
    lines = f.readlines()

new_step = """
      - name: Coverage Threshold Regression Shield
        if: github.event_name == 'pull_request'
        run: |
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }} HEAD || echo "vitest.config.ts")
          if echo "$CHANGED_FILES" | grep -q "vitest.config.ts"; then
            echo "vitest.config.ts was modified. Checking for threshold increases..."

            BASE_THRESHOLDS=$(git show origin/${{ github.base_ref }}:vitest.config.ts | grep -A5 "thresholds: {" || true)
            HEAD_THRESHOLDS=$(cat vitest.config.ts | grep -A5 "thresholds: {" || true)

            INCREASED=0
            for METRIC in statements branches functions lines; do
              BASE_VAL=$(echo "$BASE_THRESHOLDS" | grep "$METRIC:" | sed -E "s/.*$METRIC: *([0-9]+).*/\\\\1/" || echo "0")
              HEAD_VAL=$(echo "$HEAD_THRESHOLDS" | grep "$METRIC:" | sed -E "s/.*$METRIC: *([0-9]+).*/\\\\1/" || echo "0")

              if [ -n "$BASE_VAL" ] && [ -n "$HEAD_VAL" ] && [ "$HEAD_VAL" -gt "$BASE_VAL" ]; then
                echo "Threshold for $METRIC increased from $BASE_VAL to $HEAD_VAL"
                INCREASED=1
              fi
            done

            if [ "$INCREASED" -eq 1 ]; then
              if [ ! -f coverage/coverage-summary.json ]; then
                echo "❌ Thresholds were increased but coverage/coverage-summary.json is missing."
                sys_exit_1
              fi

              echo "Validating new thresholds against actual coverage..."
              for METRIC in statements branches functions lines; do
                HEAD_VAL=$(echo "$HEAD_THRESHOLDS" | grep "$METRIC:" | sed -E "s/.*$METRIC: *([0-9]+).*/\\\\1/" || echo "0")
                if [ -n "$HEAD_VAL" ] && [ "$HEAD_VAL" != "0" ]; then
                  ACTUAL=$(node -e "const c=require('./coverage/coverage-summary.json'); console.log(c.total.$METRIC.pct)")
                  if [ "$(echo "$ACTUAL < $HEAD_VAL" | bc -l)" -eq 1 ]; then
                    echo "❌ Actual $METRIC coverage ($ACTUAL%) is lower than new threshold ($HEAD_VAL%)"
                    sys_exit_1
                  else
                    echo "✅ Actual $METRIC coverage ($ACTUAL%) meets new threshold ($HEAD_VAL%)"
                  fi
                fi
              done
            fi
          fi
"""

new_step = new_step.replace('sys_exit_1', 'exit 1')

out_lines = []
for line in lines:
    out_lines.append(line)
    if "run: bun run test:coverage" in line:
        out_lines.append(new_step)

with open('.github/workflows/ci-runtime-gates.yml', 'w') as f:
    f.writelines(out_lines)
