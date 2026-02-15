# Iron Dome Handover

## Overview

This feature implements strict branch protection for the `main` branch, ensuring that all code changes pass through required status checks and reviews.

## Components

- **Script**: `scripts/ops/activate_iron_dome.mjs` - The core logic for branch protection.
- **Deployment**: `scripts/ops/deploy_iron_dome.sh` - Helper script for identifying deployment and running the activation.
- **Validation**: `scripts/ops/iron_dome_validation.md` - Checklist proving the implementation meets requirements.

## Usage

1.  **Prerequisites**: Ensure you have a GitHub Personal Access Token (PAT) with `repo` scope.
2.  **Run Activation**:
    ```bash
    export GITHUB_TOKEN="your_pat_here"
    node scripts/ops/activate_iron_dome.mjs
    ```
    Or use the deployment script:
    ```bash
    bash scripts/ops/deploy_iron_dome.sh
    ```

## Emergency Unlock

In case of emergency, the `activate_iron_dome.mjs` script contains a commented-out `emergencyUnlock` function that can be used to remove protections.
