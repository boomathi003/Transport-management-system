
import React, { useState, useEffect } from 'react';
import { AttentionMessage, Priority } from '../types';
import { TransportDataService } from '../services/dataService';
import { Plus, X, Save, Megaphone, Trash2, Edit2, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const AttentionView: React.FC = () => {
  const [messages, setMessages] = useState<AttentionMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'Medium' as Priority
  });

  const loadMessages = () => {
    const msgs = TransportDataService.getAttentionMessages();
    setMessages(msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      TransportDataService.updateAttentionMessage(editingId, formData);
    } else {
      TransportDataService.addAttentionMessage(formData);
    }
    loadMessages();
    closeModal();
    alert("Record Saved Successfully!");
  };

  const openEditModal = (msg: AttentionMessage) => {
    setEditingId(msg.id);
    setFormData({
      title: msg.title,
      message: msg.message,
      date: msg.date,
      priority: msg.priority
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      title: '',
      message: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'Medium'
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      TransportDataService.deleteAttentionMessage(id);
      loadMessages();
    }
  };

  const priorityColors = {
    High: 'bg-rose-100 text-rose-700 border-rose-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Low: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attention Messages</h1>
          <p className="text-slate-500 text-sm">Post alerts, announcements, and system warnings.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-rose-100"
        >
          <Plus size={20} />
          New Alert
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`bg-white p-6 rounded-[2rem] shadow-sm border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${msg.priority === 'High' ? 'border-rose-100 ring-2 ring-rose-50' : 'border-slate-50'}`}
          >
            <div className="flex gap-4 items-start flex-1">
              <div className={`p-4 rounded-2xl shrink-0 ${
                msg.priority === 'High' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 
                msg.priority === 'Medium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 
                'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              }`}>
                <Megaphone size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-black text-slate-800 text-lg">{msg.title}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityColors[msg.priority]}`}>
                    {msg.priority}
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{msg.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                    <Clock size={12} /> {msg.date}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:self-center bg-slate-50 p-2 rounded-2xl">
              <button 
                onClick={() => openEditModal(msg)}
                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                title="Edit"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => handleDelete(msg.id)}
                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all"
                title="Delete"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
            <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold">No attention messages posted yet.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {editingId ? 'Edit Attention Message' : 'New Attention Message'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Attention Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traffic Alert or Holiday Update"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-500 transition-all font-bold"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Message Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide detailed information here..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-500 transition-all"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-500"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Priority Level</label>
                  <select
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-500 font-bold"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as Priority})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex justify-center items-center gap-3 uppercase tracking-widest"
              >
                <Save />
                {editingId ? 'Update Message' : 'Save Attention'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttentionView;
