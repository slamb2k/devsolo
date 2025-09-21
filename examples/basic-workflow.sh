#!/bin/bash
# Basic han-solo workflow example

echo "=== han-solo Basic Workflow Example ==="
echo

# Initialize han-solo in your project
echo "1. Initialize han-solo in your project:"
echo "   hansolo init"
echo

# Start a new feature
echo "2. Start a new feature:"
echo "   hansolo launch --branch feature/awesome-feature"
echo

# Make changes and commit
echo "3. Make your changes and commit:"
echo "   # Edit files..."
echo "   git add ."
echo "   hansolo ship --message 'feat: implement awesome feature'"
echo

# For hotfixes
echo "4. For emergency fixes:"
echo "   hansolo hotfix --issue 'PROD-123' --severity critical"
echo

# Check status
echo "5. Check workflow status:"
echo "   hansolo status"
echo

# List sessions
echo "6. List all active sessions:"
echo "   hansolo sessions"
echo

# Switch between sessions
echo "7. Switch to another session:"
echo "   hansolo swap feature/other-feature"
echo

# Abort if needed
echo "8. Abort current workflow:"
echo "   hansolo abort --yes"
echo

echo "=== End of Example ==="#