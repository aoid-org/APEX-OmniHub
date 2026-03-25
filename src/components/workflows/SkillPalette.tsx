/**
 * SkillPalette — Skill list with drag-to-canvas and click-to-add
 * Extracted from WorkflowBuilder.tsx to reduce component size.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Sparkles } from 'lucide-react';

export interface SkillRecord {
  id: string;
  name: string;
  trigger_intent: string;
  is_active: boolean;
}

interface SkillPaletteProps {
  skills: SkillRecord[] | undefined;
  onAddSkill: (skill: SkillRecord) => void;
  onDragStart: (e: React.DragEvent, skill: SkillRecord) => void;
}

export const SkillPalette = memo(function SkillPalette({
  skills,
  onAddSkill,
  onDragStart,
}: SkillPaletteProps) {
  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Skill Palette
        </CardTitle>
        <CardDescription className="text-xs">
          Drag skills onto the canvas
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[480px] px-3 pb-3">
          {skills?.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No skills yet. Forge one first.
            </p>
          )}
          {skills?.map((skill) => (
            <SkillPaletteItem
              key={skill.id}
              skill={skill}
              onAdd={onAddSkill}
              onDragStart={onDragStart}
            />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// SkillPaletteItem
// ---------------------------------------------------------------------------

interface SkillPaletteItemProps {
  skill: SkillRecord;
  onAdd: (skill: SkillRecord) => void;
  onDragStart: (e: React.DragEvent, skill: SkillRecord) => void;
}

const SkillPaletteItem = memo(function SkillPaletteItem({
  skill,
  onAdd,
  onDragStart,
}: SkillPaletteItemProps) {
  const handleClick = useCallback(() => onAdd(skill), [skill, onAdd]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onAdd(skill);
      }
    },
    [skill, onAdd],
  );
  const handleDrag = useCallback(
    (e: React.DragEvent) => onDragStart(e, skill),
    [skill, onDragStart],
  );

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDrag}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-2 group cursor-grab active:cursor-grabbing mb-1 border border-transparent hover:border-border bg-transparent"
    >
      <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{skill.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {skill.trigger_intent}
        </p>
      </div>
      <span className="ml-auto shrink-0 text-muted-foreground group-hover:text-primary">
        <Plus className="h-3.5 w-3.5" />
      </span>
    </button>
  );
});
