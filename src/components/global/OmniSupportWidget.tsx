import { useState, useEffect, type FormEvent } from 'react';
import { Mail, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApexRealtimeGateway } from '@/lib/realtime/ApexRealtimeGateway';

export function OmniSupportWidget(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      ApexRealtimeGateway.connect({ skillId: 'omnisupport' })
        .then(() => console.warn('[OmniSupport] Connected'))
        .catch((err: unknown) => console.warn('[OmniSupport] Connection failed:', err));
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const mailtoLink = `mailto:info-outreach@apexomnihub.icu?subject=Support Request from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}%0D%0A%0D%0AFrom: ${encodeURIComponent(email)}`;
    globalThis.location.href = mailtoLink;
  };

  return (
    <div data-testid="omni-support-widget" className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <Button onClick={() => setIsOpen(true)} className="h-14 w-14 rounded-full shadow-lg" size="icon">
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="bg-background border rounded-lg shadow-xl w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Support
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
            />
            <Button type="submit" className="w-full">
              Send Message
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default OmniSupportWidget;
