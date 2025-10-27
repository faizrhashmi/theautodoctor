#!/bin/bash

# Project Cleanup Preview Script
# Shows what files will be affected by cleanup

echo "========================================"
echo "  PROJECT CLEANUP PREVIEW"
echo "========================================"
echo ""

echo "📦 BACKUP FILES (will be deleted):"
find src -name "*.backup" 2>/dev/null | while read file; do
    size=$(du -h "$file" 2>/dev/null | cut -f1)
    echo "  ❌ $file ($size)"
done
echo ""

echo "🧪 TEST PAGES (will be deleted):"
for dir in src/app/test-auth src/app/test-mechanics src/app/test-new-features; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo "  ❌ $dir/ ($size)"
    fi
done
echo ""

echo "🔧 PATCH WORKSPACE (review then delete):"
if [ -d "_aad_patch_workspace" ]; then
    size=$(du -sh "_aad_patch_workspace" 2>/dev/null | cut -f1)
    echo "  ⚠️  _aad_patch_workspace/ ($size)"
    file_count=$(find _aad_patch_workspace -type f | wc -l)
    echo "     Contains $file_count files"
fi
echo ""

echo "📄 DOCUMENTATION FILES (will be reorganized):"
md_count=$(ls -1 *.md 2>/dev/null | wc -l)
echo "  📁 $md_count markdown files in root directory"
echo "  → Will be moved to docs/ subdirectories"
echo ""

echo "❓ TEMPLATE FILES (need review):"
for file in src/app/*/template.tsx src/app/*/*/template.tsx; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file" 2>/dev/null)
        echo "  ⚠️  $file ($lines lines)"
    fi
done
echo ""

echo "🔍 UTILITY SCRIPTS (need review):"
for script in scripts/apply-*.js scripts/check-*.js scripts/test-*.js scripts/full-*.js; do
    if [ -f "$script" ]; then
        size=$(du -h "$script" 2>/dev/null | cut -f1)
        echo "  ⚠️  $script ($size)"
    fi
done
echo ""

echo "========================================"
echo "  SUMMARY"
echo "========================================"

backup_count=$(find src -name "*.backup" 2>/dev/null | wc -l)
test_dirs=0
for dir in src/app/test-auth src/app/test-mechanics src/app/test-new-features; do
    [ -d "$dir" ] && test_dirs=$((test_dirs + 1))
done

echo "✅ Safe to delete immediately:"
echo "   • $backup_count backup files"
echo "   • $test_dirs test page directories"
echo ""
echo "⚠️  Needs review:"
echo "   • 1 patch workspace directory"
echo "   • $md_count documentation files (reorganize)"
echo "   • Template files (verify usage)"
echo "   • Utility scripts (archive or delete)"
echo ""
echo "📖 Full details in PROJECT_CLEANUP_AUDIT.md"
echo "========================================"
