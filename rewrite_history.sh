#!/bin/bash
git filter-branch --msg-filter '
    sed -e "s/^chore: Report blocked state/chore: report blocked state/g"
' -f HEAD~6..HEAD
