import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  isRequired?: boolean;
  error?: string;
  showSample?: boolean;
  sampleText?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label = 'Цвет',
  isRequired = false,
  error,
  showSample = true,
  sampleText = 'Образец цвета'
}) => {
  const [currentColor, setCurrentColor] = useState(color || '#48a9a6');

  useEffect(() => {
    if (color && color !== currentColor) {
      setCurrentColor(color);
    }
  }, [color]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  return (
    <div className="color-picker">
      {label && (
        <label htmlFor="color-picker" className="block text-sm font-medium text-gray-700 mb-1">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="flex items-center space-x-3">
        <input
          type="color"
          id="color-picker"
          value={currentColor}
          onChange={handleColorChange}
          className={`h-10 w-14 rounded cursor-pointer ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        
        {showSample && (
          <div className="flex-1">
            <div 
              className="px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: `${currentColor}20`,
                color: currentColor,
                border: `1px solid ${currentColor}`
              }}
            >
              {sampleText}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default ColorPicker; 