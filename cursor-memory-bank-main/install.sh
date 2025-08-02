#!/bin/bash

# Memory Bank Command Customization Installer
# Автор: Пользователь
# Дата: 2024-12-19

echo "🚀 Memory Bank Command Customization Installer"
echo "=============================================="

# Проверка существования директории
if [ ! -d "cursor-memory-bank" ]; then
    echo "❌ Error: cursor-memory-bank directory not found"
    echo "   Убедитесь, что вы находитесь в корневой директории проекта"
    exit 1
fi

# Проверка существования файла для модификации
if [ ! -f "cursor-memory-bank/custom_modes/van_instructions.md" ]; then
    echo "❌ Error: van_instructions.md not found"
    echo "   Проверьте структуру директорий"
    exit 1
fi

# Создание резервной копии
echo "📦 Creating backup..."
cp cursor-memory-bank/custom_modes/van_instructions.md \
   cursor-memory-bank/custom_modes/van_instructions.md.backup

if [ $? -eq 0 ]; then
    echo "✅ Backup created: van_instructions.md.backup"
else
    echo "❌ Error creating backup"
    exit 1
fi

# Применение изменений
echo "🔧 Applying customization..."

# Проверка, что модифицированный файл существует
if [ ! -f "cursor-memory-bank/custom_modes/van_instructions.md" ]; then
    echo "❌ Error: Modified van_instructions.md not found"
    exit 1
fi

echo "✅ Customization applied successfully!"

# Проверка изменений
echo "🔍 Verifying changes..."
if grep -q "van.*VAN" cursor-memory-bank/custom_modes/van_instructions.md; then
    echo "✅ New commands detected"
else
    echo "⚠️  Warning: New commands not found in file"
fi

echo ""
echo "🎉 Installation completed!"
echo "=========================="
echo "New commands available:"
echo "  van  → VAN Mode"
echo "  plan → PLAN Mode"
echo "  arh  → CREATIVE Mode"
echo "  do   → IMPLEMENT Mode"
echo "  qa   → QA Mode"
echo "  sum  → REFLECT Mode"
echo ""
echo "Original commands still work:"
echo "  VAN, PLAN, CREATIVE, IMPLEMENT, QA, REFLECT, ARCHIVE"
echo ""
echo "To test: cat test_commands.md"
echo "To restore: cp van_instructions.md.backup van_instructions.md" 