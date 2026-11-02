/**
 * Customer User Support & Help Page
 * Location: frontend/src/pages/user/UserSupport.jsx
 */

import React, { useState } from 'react';
import { HelpCircle, Mail, MessageSquare, Phone, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useToast } from '@/context/ToastContext';

export function UserSupport() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error('Please enter a subject and message.');
      return;
    }
    setSent(true);
    toast.success('Your support request has been dispatched to Andhra Soft Tech engineering.');
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Help & Customer Support
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Have questions about your lead extractions, subscription, or API limits? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-surface-900 uppercase">Email Support</h4>
          <p className="text-[11px] text-surface-500 mt-1 mb-3">Guaranteed response within 24 hours.</p>
          <a href="mailto:support@andhrasofttech.com" className="text-xs font-bold text-brand-600 hover:underline">
            support@andhrasofttech.com
          </a>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-surface-900 uppercase">Live Technical Help</h4>
          <p className="text-[11px] text-surface-500 mt-1 mb-3">Pro & Business priority queue.</p>
          <span className="text-xs font-bold text-emerald-600">Available Mon-Sat</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-surface-900 uppercase">Direct Enterprise Desk</h4>
          <p className="text-[11px] text-surface-500 mt-1 mb-3">Dedicated support manager.</p>
          <span className="text-xs font-bold text-purple-600">Andhra Soft Tech Ops</span>
        </div>
      </div>

      {/* Ticket / Message Form */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Send a Support Message
        </h3>

        {sent ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-emerald-900">Message Received!</h4>
            <p className="text-xs text-emerald-700 mt-1">
              Our engineering team will review your inquiry and follow up at your registered email address.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Subject"
              type="text"
              placeholder="e.g. Lead extraction quota inquiry or column presets"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
                Message Description
              </label>
              <textarea
                rows={4}
                className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Explain the issue or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <Button size="sm" variant="primary" type="submit" iconRight={Send}>
              Submit Request
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default UserSupport;

