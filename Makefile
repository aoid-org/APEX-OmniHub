# Pre-existing targets (note: colon-named make targets are not portable;
# renamed to hyphen equivalents for make compatibility — npm scripts unchanged)
.PHONY: test-wwwct test-wwwct-sandbox test-wwwct-report
.PHONY: apex-policy apex-policy-json apex-validate apex-verify apex-install apex-manifest apex-zip help

test-wwwct:
	npm run test:wwwct

test-wwwct-sandbox:
	npm run test:wwwct:sandbox

test-wwwct-report:
	npm run test:wwwct:report

# APEX governance targets

help:
	@echo "APEX Bible — local commands"
	@echo "  make apex-policy       Run policy check (human-readable)"
	@echo "  make apex-policy-json  Run policy check (JSON to stdout)"
	@echo "  make apex-validate     Validate package structure + manifest hashes"
	@echo "  make apex-verify       Full local validation (policy + structure)"
	@echo "  make apex-install      Print install instructions"
	@echo "  make apex-manifest     Regenerate package_manifest.json with current SHA-256 hashes"
	@echo "  make apex-zip          Build distributable zip"

apex-policy:
	python3 governance/ci/scripts/apex_policy_check.py

apex-policy-json:
	python3 governance/ci/scripts/apex_policy_check.py --json

apex-validate:
	@python3 governance/ci/scripts/apex_validate_manifest.py

apex-verify: apex-policy apex-validate
	@echo "APEX local validation passed."

apex-install:
	@echo "Install: copy /governance, /.github, Makefile, README.md, CHANGELOG.md,"
	@echo "         CONTRIBUTING.md, LICENSE, SECURITY.md, package_manifest.json"
	@echo "         into your repo root."
	@echo "Then enable governance-gate as a required status check in branch protection."

apex-manifest:
	@python3 governance/ci/scripts/apex_validate_manifest.py --regenerate

apex-zip:
	@rm -f APEX_BIBLE_COMPLETE_PACKAGE.zip
	@zip -r APEX_BIBLE_COMPLETE_PACKAGE.zip \
		governance .github \
		README.md CHANGELOG.md CONTRIBUTING.md LICENSE SECURITY.md \
		Makefile package_manifest.json \
		-x "*.DS_Store" -x "*__pycache__*"
	@echo "Built APEX_BIBLE_COMPLETE_PACKAGE.zip"
