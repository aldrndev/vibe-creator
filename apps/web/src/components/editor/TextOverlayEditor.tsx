import { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Input,
  Textarea,
  Slider,
  Select,
  SelectItem,
  Divider,
  Chip
} from '@heroui/react';
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, Sparkles } from 'lucide-react';
import type { TextOverlay } from '@vibe-creator/shared';
import { useEditorStore } from '@/stores/editor-store';

// Font family options
const FONT_FAMILIES = [
  { id: 'Inter', name: 'Inter' },
  { id: 'Roboto', name: 'Roboto' },
  { id: 'Poppins', name: 'Poppins' },
  { id: 'Montserrat', name: 'Montserrat' },
  { id: 'Open Sans', name: 'Open Sans' },
  { id: 'Oswald', name: 'Oswald' },
  { id: 'Playfair Display', name: 'Playfair Display' },
  { id: 'Bebas Neue', name: 'Bebas Neue' },
];

// Animation presets
const ANIMATIONS = [
  { id: 'none', name: 'None' },
  { id: 'fade', name: 'Fade In' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'slide-down', name: 'Slide Down' },
  { id: 'typewriter', name: 'Typewriter' },
];

// Position presets
const POSITION_PRESETS = [
  { id: 'top-left', x: 10, y: 10, label: 'Top Left' },
  { id: 'top-center', x: 50, y: 10, label: 'Top Center' },
  { id: 'top-right', x: 90, y: 10, label: 'Top Right' },
  { id: 'center', x: 50, y: 50, label: 'Center' },
  { id: 'bottom-left', x: 10, y: 90, label: 'Bottom Left' },
  { id: 'bottom-center', x: 50, y: 90, label: 'Bottom Center' },
  { id: 'bottom-right', x: 90, y: 90, label: 'Bottom Right' },
];

// Color presets
const COLOR_PRESETS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6B6B', '#4ECDC4'
];

interface TextOverlayEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingOverlay?: TextOverlay | null;
}

export function TextOverlayEditor({ isOpen, onClose, editingOverlay }: TextOverlayEditorProps) {
  const { timeline, addTextOverlay, updateTextOverlay } = useEditorStore();
  
  // Form state
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(48);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [color, setColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [animation, setAnimation] = useState<'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter'>('fade');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(5000);
  
  // Initialize form when editing
  useEffect(() => {
    if (editingOverlay) {
      setText(editingOverlay.text);
      setFontFamily(editingOverlay.fontFamily);
      setFontSize(editingOverlay.fontSize);
      setFontWeight(editingOverlay.fontWeight);
      setFontStyle(editingOverlay.fontStyle);
      setColor(editingOverlay.color);
      setBackgroundColor(editingOverlay.backgroundColor || '');
      setX(editingOverlay.x);
      setY(editingOverlay.y);
      setTextAlign(editingOverlay.textAlign);
      setAnimation(editingOverlay.animation);
      setStartMs(editingOverlay.startMs);
      setEndMs(editingOverlay.endMs);
    } else {
      // Reset to defaults
      setText('');
      setFontFamily('Inter');
      setFontSize(48);
      setFontWeight('bold');
      setFontStyle('normal');
      setColor('#FFFFFF');
      setBackgroundColor('');
      setX(50);
      setY(50);
      setTextAlign('center');
      setAnimation('fade');
      setStartMs(0);
      setEndMs(Math.min(5000, timeline.durationMs || 5000));
    }
  }, [editingOverlay, isOpen, timeline.durationMs]);
  
  const handleSave = () => {
    if (!text.trim()) return;
    
    const overlayData = {
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      color,
      backgroundColor: backgroundColor || undefined,
      x,
      y,
      textAlign,
      startMs,
      endMs,
      animation,
    };
    
    if (editingOverlay) {
      updateTextOverlay(editingOverlay.id, overlayData);
    } else {
      addTextOverlay(overlayData);
    }
    
    onClose();
  };
  
  const applyPositionPreset = (preset: typeof POSITION_PRESETS[0]) => {
    setX(preset.x);
    setY(preset.y);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Type size={20} />
          {editingOverlay ? 'Edit Text Overlay' : 'Add Text Overlay'}
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-6">
            {/* Text Input */}
            <Textarea
              label="Text"
              placeholder="Enter your text..."
              value={text}
              onValueChange={setText}
              minRows={2}
              maxRows={4}
            />
            
            <Divider />
            
            {/* Font Settings */}
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Font Family"
                selectedKeys={[fontFamily]}
                onSelectionChange={(keys) => setFontFamily(Array.from(keys)[0] as string)}
              >
                {FONT_FAMILIES.map(font => (
                  <SelectItem key={font.id} style={{ fontFamily: font.id }}>
                    {font.name}
                  </SelectItem>
                ))}
              </Select>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Font Size</span>
                  <span>{fontSize}px</span>
                </div>
                <Slider 
                  size="sm"
                  minValue={12}
                  maxValue={120}
                  step={2}
                  value={fontSize}
                  onChange={(v) => setFontSize(v as number)}
                  aria-label="Font Size"
                />
              </div>
            </div>
            
            {/* Font Style Toggles */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={fontWeight === 'bold' ? 'solid' : 'bordered'}
                onPress={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
              >
                B
              </Button>
              <Button
                size="sm"
                variant={fontStyle === 'italic' ? 'solid' : 'bordered'}
                className="italic"
                onPress={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
              >
                I
              </Button>
            </div>
            
            <Divider />
            
            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette size={16} />
                <span className="text-sm font-medium">Colors</span>
              </div>
              
                <div>
                <p className="text-xs text-foreground/60 mb-2">Text Color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        color === c ? 'border-primary scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  {/* Custom color picker */}
                  <label 
                    className="w-8 h-8 rounded-lg border-2 border-divider overflow-hidden cursor-pointer hover:border-primary transition-all relative"
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="w-full h-full"
                      style={{ 
                        background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                      }}
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground/60 mb-2">Background Color (optional)</p>
                  {backgroundColor && (
                    <Button size="sm" variant="light" onPress={() => setBackgroundColor('')}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['#000000', '#FFFFFF', '#FF0000', '#00000080', '#FFFFFF80'].map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        backgroundColor === c ? 'border-primary scale-110' : 'border-divider'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setBackgroundColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <Divider />
            
            {/* Position */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Position</p>
              
              <div className="flex gap-2 flex-wrap">
                {POSITION_PRESETS.map(preset => (
                  <Chip
                    key={preset.id}
                    variant={x === preset.x && y === preset.y ? 'solid' : 'bordered'}
                    color={x === preset.x && y === preset.y ? 'primary' : 'default'}
                    className="cursor-pointer"
                    onClick={() => applyPositionPreset(preset)}
                  >
                    {preset.label}
                  </Chip>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>X Position</span>
                    <span>{x}%</span>
                  </div>
                  <Slider 
                    size="sm"
                    minValue={0}
                    maxValue={100}
                    step={1}
                    value={x}
                    onChange={(v) => setX(v as number)}
                    aria-label="X Position"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Y Position</span>
                    <span>{y}%</span>
                  </div>
                  <Slider 
                    size="sm"
                    minValue={0}
                    maxValue={100}
                    step={1}
                    value={y}
                    onChange={(v) => setY(v as number)}
                    aria-label="Y Position"
                  />
                </div>
              </div>
            </div>
            
            {/* Alignment */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={textAlign === 'left' ? 'solid' : 'bordered'}
                isIconOnly
                onPress={() => setTextAlign('left')}
              >
                <AlignLeft size={16} />
              </Button>
              <Button
                size="sm"
                variant={textAlign === 'center' ? 'solid' : 'bordered'}
                isIconOnly
                onPress={() => setTextAlign('center')}
              >
                <AlignCenter size={16} />
              </Button>
              <Button
                size="sm"
                variant={textAlign === 'right' ? 'solid' : 'bordered'}
                isIconOnly
                onPress={() => setTextAlign('right')}
              >
                <AlignRight size={16} />
              </Button>
            </div>
            
            <Divider />
            
            {/* Animation */}
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <Select 
                label="Animation"
                selectedKeys={[animation]}
                onSelectionChange={(keys) => setAnimation(Array.from(keys)[0] as typeof animation)}
                className="flex-1"
              >
                {ANIMATIONS.map(anim => (
                  <SelectItem key={anim.id}>
                    {anim.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <Divider />
            
            {/* Timing */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Start Time (ms)"
                value={startMs.toString()}
                onValueChange={(v) => setStartMs(parseInt(v) || 0)}
              />
              <Input
                type="number"
                label="End Time (ms)"
                value={endMs.toString()}
                onValueChange={(v) => setEndMs(parseInt(v) || 5000)}
              />
            </div>
            
            {/* Preview */}
            <div 
              className="relative bg-black rounded-lg overflow-hidden"
              style={{ aspectRatio: '16/9', minHeight: 200 }}
            >
              <div
                className="absolute transition-all"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily,
                  fontSize: `${fontSize * 0.4}px`, // Scale down for preview
                  fontWeight,
                  fontStyle,
                  color,
                  backgroundColor: backgroundColor || 'transparent',
                  padding: backgroundColor ? '4px 8px' : 0,
                  borderRadius: 4,
                  textAlign,
                  whiteSpace: 'pre-wrap',
                  maxWidth: '90%',
                }}
              >
                {text || 'Preview text...'}
              </div>
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSave} isDisabled={!text.trim()}>
            {editingOverlay ? 'Save Changes' : 'Add Text'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
