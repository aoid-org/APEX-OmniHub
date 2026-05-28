/**
 * OmniSpatialDialogRenderers — Dialog sub-renderers for OmniSpatialHost
 * @module apps/omnihub-site/dashboard/components/OmniSpatialDialogRenderers
 *
 * Extracted from OmniSpatialHost to satisfy the 500-line policy limit.
 * Contains FormModalRenderer and DialogModeRenderer.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState } from 'react';
import type { OmniModalConfig } from '@/stores/omniModalStore';
import {
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { ModuleRenderer } from './ModuleRenderer';

// ============================================================================
// Types
// ============================================================================

interface FormField {
  key?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

// ============================================================================
// FormModalRenderer — schema-driven field renderer
// ============================================================================

export function FormModalRenderer({
  modal,
  isProcessing,
  onAction,
  onClose,
}: Readonly<{
  modal: OmniModalConfig;
  isProcessing: boolean;
  onAction: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}>) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const schemaFields = modal.schema?.fields as ReadonlyArray<FormField> | undefined;

  // Default fields when no schema provided
  const defaultFields: FormField[] = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Enter name…' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description…' },
  ];

  const fields = (schemaFields && schemaFields.length > 0) ? schemaFields : defaultFields;

  const handleChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onAction({ status: 'submitted', data: formValues });
  };

  return (
    <div className="py-4">
      <div className="space-y-4">
        {fields.map((field, idx) => {
          const key = field.key ?? String(idx);
          const label = field.label ?? `Field ${idx + 1}`;
          const type = field.type ?? 'text';
          const placeholder = field.placeholder ?? '';
          const inputClass =
            'w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground';
          const renderFieldInput = () => {
            if (type === 'textarea') {
              return (
                <textarea
                  className={`${inputClass} min-h-[80px] resize-none`}
                  placeholder={placeholder}
                  value={formValues[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  disabled={isProcessing}
                />
              );
            }
            if (type === 'select' && modal.schema?.options) {
              return (
                <select
                  className={inputClass}
                  value={formValues[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">Select…</option>
                  {(modal.schema.options as ReadonlyArray<{ value: string; label: string }>).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                type={type}
                className={inputClass}
                placeholder={placeholder}
                value={formValues[key] ?? ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={isProcessing}
              />
            );
          };
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {renderFieldInput()}
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// DialogModeRenderer — type-switched dialog content
// ============================================================================

export function DialogModeRenderer({
  modal,
  isProcessing,
  onAction,
  onClose,
}: Readonly<{
  modal: OmniModalConfig;
  isProcessing: boolean;
  onAction: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}>) {
  switch (modal.type) {
    case 'oauth':
      return (
        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Connect your <strong>{modal.provider}</strong> account to
            synchronize data directly into OmniBoard.
          </p>
          <Button
            onClick={() => onAction({ action: 'init_oauth' })}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Authorize {modal.provider}
          </Button>
        </div>
      );

    case 'form':
      return (
        <FormModalRenderer
          modal={modal}
          isProcessing={isProcessing}
          onAction={onAction}
          onClose={onClose}
        />
      );

    case 'selection':
      return (
        <div className="py-4">
          <div className="space-y-2">
            {modal.schema?.items &&
            Array.isArray(modal.schema.items)
              ? (modal.schema.items as ReadonlyArray<Record<string, unknown>>).map(
                  (item, idx) => {
                    const itemKey = typeof item.id === 'string' || typeof item.id === 'number'
                      ? String(item.id)
                      : String(idx);
                    let itemLabel = `Option ${String(idx + 1)}`;
                    if (typeof item.label === 'string') {
                      itemLabel = item.label;
                    } else if (typeof item.name === 'string') {
                      itemLabel = item.name;
                    }
                    return (
                      <button
                        key={itemKey}
                        type="button"
                        className="w-full text-left px-4 py-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-sm"
                        onClick={() => onAction({ selected: item })}
                        disabled={isProcessing}
                      >
                        {itemLabel}
                      </button>
                    );
                  },
                )
              : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No selection items provided.
                </p>
              )}
          </div>
        </div>
      );

    case 'confirmation':
      return (
        <div className="py-4">
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={() => onAction({ confirmed: true })}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </div>
      );

    case 'module':
      return (
        <ModuleRenderer
          moduleKey={
            typeof modal.contextData?.moduleKey === 'string'
              ? modal.contextData.moduleKey
              : modal.id
          }
          onClose={onClose}
        />
      );

    default:
      return null;
  }
}
