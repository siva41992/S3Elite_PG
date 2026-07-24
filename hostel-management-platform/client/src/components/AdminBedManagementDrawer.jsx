import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, Calendar, DollarSign, FileText,
  CheckCircle, AlertCircle, Edit3, RefreshCw, MessageSquare,
  Send, Download, Upload, Clock, Building, Briefcase, Shield,
  Save, AlertTriangle, UserCheck, Smartphone, MapPin, Activity, BedDouble
} from 'lucide-react';
import { io } from 'socket.io-client';

const AdminBedManagementDrawer = ({ bedId, onClose, onBedUpdated }) => {
  if (!bedId) return null;

  const [loading, setLoading] = useState(true);
  const [bedData, setBedData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [activeTab, setActiveTab] = useState('profile'); // profile | payments | timeline
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showVacate, setShowVacate] = useState(false);

  const [formData, setFormData] = useState({});

  const [transferData, setTransferData] = useState({ roomNumber: '', bedNumber: '' });
  const [vacateData, setVacateData] = useState({ exitDate: '', reason: '', refundAmount: 0, damageCharges: 0, notes: '' });

  
  const adminToken = JSON.parse(localStorage.getItem('s3elite_admin'))?.token;

  const apiFetch = async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${adminToken}` };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      localStorage.removeItem('s3elite_admin');
      window.location.reload();
    }
    return response;
  };

  const fetchBedDetails = async () => {

    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/erp/bed/${bedId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBedData(json.data);
          setRoomData(json.data.room || null);
          setPayments(json.data.payments || []);
          setComplaints(json.data.complaints || []);
          
          setFormData({
            studentName: json.data.studentName || '',
            phone: json.data.phone || '',
            whatsappNumber: json.data.whatsappNumber || '',
            email: json.data.email || '',
            fatherName: json.data.fatherName || '',
            motherName: json.data.motherName || '',
            emergencyContact: json.data.emergencyContact || '',
            currentAddress: json.data.currentAddress || '',
            permanentAddress: json.data.permanentAddress || '',
            aadhaarNumber: json.data.aadhaarNumber || '',
            occupation: json.data.occupation || '',
            collegeName: json.data.collegeName || '',
            companyName: json.data.companyName || '',
            bloodGroup: json.data.bloodGroup || '',
            joiningDate: json.data.joiningDate || '',
            duration: json.data.duration || '',
            rentPerBed: json.data.rentPerBed || 0,
            securityDeposit: json.data.securityDeposit || 0,
            discount: json.data.discount || 0,
            nextDueDate: json.data.nextDueDate ? (json.data.nextDueDate.includes('T') ? json.data.nextDueDate.substring(0, 10) : json.data.nextDueDate) : '',
            notes: json.data.notes || '',
            messEnabled: json.data.messEnabled || false,
            messCharges: json.data.messCharges || 2500,
            messStartDate: json.data.messStartDate ? json.data.messStartDate.substring(0, 10) : '',
            messRenewalDate: json.data.messRenewalDate ? json.data.messRenewalDate.substring(0, 10) : ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching bed details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBedDetails();
    
    const RENDER_BACKEND_URL = 'https://s3elite-pg-final.onrender.com';
    const socket = io(RENDER_BACKEND_URL, { transports: ['polling', 'websocket'] });
    socket.on('ERP_EVENT', () => {
      fetchBedDetails();
    });
    return () => socket.disconnect();
  }, [bedId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/admin/erp/bed/${bedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchBedDetails();
        if (onBedUpdated) onBedUpdated();
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.roomNumber || !transferData.bedNumber) {
      alert('Please select target room and bed');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/admin/erp/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: bedData.studentId,
          currentBedId: bedId,
          targetRoomNumber: transferData.roomNumber,
          targetBedNumber: transferData.bedNumber
        })
      });
      if (res.ok) {
        setShowTransfer(false);
        onClose();
        if (onBedUpdated) onBedUpdated();
      } else {
        const json = await res.json();
        alert(json.message);
      }
    } catch (err) {
      alert('Transfer failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVacate = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/admin/erp/vacate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId,
          ...vacateData
        })
      });
      if (res.ok) {
        setShowVacate(false);
        onClose();
        if (onBedUpdated) onBedUpdated();
      }
    } catch (err) {
      alert('Vacate failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendFeeReminder = () => {
    if (!bedData || !bedData.whatsappNumber) {
      alert('No WhatsApp number available for this student.');
      return;
    }
    const amount = bedData.pendingAmount || bedData.rentPerBed || 6000;
    const dueDate = bedData.nextDueDate || 'this month';
    const message = `Hello ${bedData.studentName}, this is a gentle reminder from S3 Elite PG. Your rent of Rs. ${amount} was due on ${dueDate}. Please clear it at the earliest to avoid late fees. Thank you!`;
    const phoneNum = bedData.whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading || !bedData) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-2xl bg-white border-l border-borderLight flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Determine Badge colors
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Due Today': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Due Tomorrow': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Overdue': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Advance Paid': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-100 text-textMuted border-borderLight';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="w-full max-w-3xl bg-white border-l border-borderLight shadow-2xl h-full flex flex-col slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-borderLight bg-slate-50 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={bedData.profilePhoto} alt="Profile" className="w-14 h-14 rounded-full border-2 border-orange-500/50 object-cover" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0b1120] flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-[#0b1120]" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-textDark">{bedData.studentName || 'Vacant Bed'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-bold text-primary bg-orange-500/10 px-2 py-0.5 rounded-md">Room {bedData.roomNumber} - Cot #{bedData.bedNumber}</span>
                {bedData.occupied && <span className="text-xs font-bold text-textMuted">ID: {bedData.studentId || 'N/A'}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {bedData.occupied && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-textMuted transition-all shadow-md">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {bedData.occupied && isEditing && (
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 rounded-xl bg-emerald--white text-xs font-bold transition-all shadow-md flex items-center gap-2">
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-rose-500/20 text-textMuted hover:text-rose-400 transition-all shadow-md">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions Strip */}
        {bedData.occupied && !isEditing && (
          <div className="px-6 py-4 border-b border-borderLight bg-slate-50 flex flex-wrap gap-2">
            <a href={`tel:${bedData.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold hover:bg-blue-500/20 transition-all">
              <Phone className="w-3 h-3" /> Call Student
            </a>
            <a href={`https://wa.me/${bedData.whatsappNumber?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold hover:bg-emerald-500/20 transition-all">
              <MessageSquare className="w-3 h-3" /> WhatsApp
            </a>
            <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-primary border border-amber-500/20 text-[11px] font-bold hover:bg-amber-500/20 transition-all">
              <RefreshCw className="w-3 h-3" /> Transfer Bed
            </button>
            <button onClick={() => setShowVacate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold hover:bg-rose-500/20 transition-all">
              <AlertTriangle className="w-3 h-3" /> Vacate Bed
            </button>
            <button onClick={handleSendFeeReminder} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold hover:bg-amber-500/20 transition-all">
              <Send className="w-3 h-3" /> Send Fee Reminder
            </button>
          </div>
        )}

        {/* Transfer Modal Overlay */}
        {showTransfer && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm glass-card p-6 space-y-4 border border-amber-500/30">
              <h3 className="text-lg font-bold text-textDark flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" /> Transfer Student
              </h3>
              <div>
                <label className="text-xs text-textMuted">Target Room Number</label>
                <input type="text" value={transferData.roomNumber} onChange={e => setTransferData({...transferData, roomNumber: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark" placeholder="e.g. S12" />
              </div>
              <div>
                <label className="text-xs text-textMuted">Target Cot Number</label>
                <input type="number" value={transferData.bedNumber} onChange={e => setTransferData({...transferData, bedNumber: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark" placeholder="e.g. 1" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowTransfer(false)} className="px-4 py-2 rounded text-xs text-textMuted bg-slate-100">Cancel</button>
                <button onClick={handleTransfer} disabled={isSaving} className="px-4 py-2 rounded text-xs text-textDark bg-amber-500 font-bold">{isSaving ? 'Processing...' : 'Confirm Transfer'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Vacate Modal Overlay */}
        {showVacate && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm glass-card p-6 space-y-4 border border-rose-500/30">
              <h3 className="text-lg font-bold text-textDark flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" /> Vacate Bed
              </h3>
              <div>
                <label className="text-xs text-textMuted">Exit Date</label>
                <input type="date" value={vacateData.exitDate} onChange={e => setVacateData({...vacateData, exitDate: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark text-xs" />
              </div>
              <div>
                <label className="text-xs text-textMuted">Reason for leaving</label>
                <input type="text" value={vacateData.reason} onChange={e => setVacateData({...vacateData, reason: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark text-xs" placeholder="e.g. College completed" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-textMuted">Refund (₹)</label>
                  <input type="number" value={vacateData.refundAmount} onChange={e => setVacateData({...vacateData, refundAmount: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark text-xs" />
                </div>
                <div>
                  <label className="text-xs text-textMuted">Damages (₹)</label>
                  <input type="number" value={vacateData.damageCharges} onChange={e => setVacateData({...vacateData, damageCharges: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-textMuted">Clearance Notes</label>
                <input type="text" value={vacateData.notes} onChange={e => setVacateData({...vacateData, notes: e.target.value})} className="w-full p-2 mt-1 rounded bg-white border border-borderLight text-textDark text-xs" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowVacate(false)} className="px-4 py-2 rounded text-xs text-textMuted bg-slate-100">Cancel</button>
                <button onClick={handleVacate} disabled={isSaving} className="px-4 py-2 rounded text-xs text-white-rose-600 font-bold">{isSaving ? 'Processing...' : 'Confirm Vacate'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {bedData.occupied && (
          <div className="flex border-b border-borderLight px-6 mt-4">
            {['profile', 'payments', 'timeline'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === tab ? 'border-orange-500 text-primary' : 'border-transparent text-textMuted hover:text-textMuted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* If Vacant */}
          {!bedData.occupied && (
            <div className="text-center p-12 space-y-4">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <BedDouble className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-textDark">Cot is Vacant</h3>
              <p className="text-textMuted text-sm">Room {bedData.roomNumber} - Cot #{bedData.bedNumber}</p>
              <div className="flex justify-center gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-borderLight text-center w-32">
                  <p className="text-xs text-textMuted font-bold uppercase mb-1">Status</p>
                  <p className="text-emerald-400 font-bold">{bedData.reservationStatus}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-borderLight text-center w-32">
                  <p className="text-xs text-textMuted font-bold uppercase mb-1">Rent</p>
                  <p className="text-textDark font-bold">₹{bedData.rentPerBed}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PROFILE */}
          {bedData.occupied && activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Personal Information */}
              <div>
                <h3 className="text-xs font-black text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Personal Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Full Name', key: 'studentName' },
                    { label: 'Father Name', key: 'fatherName' },
                    { label: 'Mother Name', key: 'motherName' },
                    { label: 'Blood Group', key: 'bloodGroup' },
                    { label: 'Aadhaar Number', key: 'aadhaarNumber' },
                    { label: 'Occupation', key: 'occupation' },
                    { label: 'College', key: 'collegeName' },
                    { label: 'Company', key: 'companyName' },
                  ].map((field, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-borderLight">
                      <p className="text-[10px] text-textMuted uppercase font-bold">{field.label}</p>
                      {isEditing ? (
                        <input type="text" name={field.key} value={formData[field.key] || ''} onChange={handleInputChange} className="w-full mt-1 bg-slate-100 text-textDark text-xs p-1 rounded" />
                      ) : (
                        <p className="text-xs font-bold text-textDark mt-1">{formData[field.key] || 'N/A'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-black text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Mobile Number', key: 'phone' },
                    { label: 'WhatsApp Number', key: 'whatsappNumber' },
                    { label: 'Email Address', key: 'email' },
                    { label: 'Emergency Contact', key: 'emergencyContact' },
                  ].map((field, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-borderLight">
                      <p className="text-[10px] text-textMuted uppercase font-bold">{field.label}</p>
                      {isEditing ? (
                        <input type="text" name={field.key} value={formData[field.key] || ''} onChange={handleInputChange} className="w-full mt-1 bg-slate-100 text-textDark text-xs p-1 rounded" />
                      ) : (
                        <p className="text-xs font-bold text-textDark mt-1">{formData[field.key] || 'N/A'}</p>
                      )}
                    </div>
                  ))}
                  
                  <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3 rounded-lg border border-borderLight">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Permanent Address</p>
                    {isEditing ? (
                      <textarea name="permanentAddress" value={formData.permanentAddress || ''} onChange={handleInputChange} rows="2" className="w-full mt-1 bg-slate-100 text-textDark text-xs p-1 rounded" />
                    ) : (
                      <p className="text-xs font-bold text-textDark mt-1">{formData.permanentAddress || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrative Information */}
              <div>
                <h3 className="text-xs font-black text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Stay & Admin Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Admission No', key: 'admissionNumber', readonly: true },
                    { label: 'Joining Date', key: 'joiningDate' },
                    { label: 'Duration', key: 'duration' },
                  ].map((field, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-borderLight">
                      <p className="text-[10px] text-textMuted uppercase font-bold">{field.label}</p>
                      {isEditing && !field.readonly ? (
                        <input type="text" name={field.key} value={formData[field.key] || ''} onChange={handleInputChange} className="w-full mt-1 bg-slate-100 text-textDark text-xs p-1 rounded" />
                      ) : (
                        <p className="text-xs font-bold text-textDark mt-1">{bedData[field.key] || formData[field.key] || 'N/A'}</p>
                      )}
                    </div>
                  ))}
                  <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3 rounded-lg border border-borderLight">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Admin Notes</p>
                    {isEditing ? (
                      <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} rows="2" className="w-full mt-1 bg-slate-100 text-textDark text-xs p-1 rounded" />
                    ) : (
                      <p className="text-xs font-bold text-textDark mt-1">{formData.notes || 'No notes.'}</p>
                    )}
                  </div>
                </div>
              </div>



            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {bedData.occupied && activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-borderLight">
                  <p className="text-[10px] text-textMuted uppercase font-bold">Monthly Rent</p>
                  {isEditing ? <input type="number" name="rentPerBed" value={formData.rentPerBed} onChange={handleInputChange} className="w-full bg-slate-100 p-1 text-textDark text-sm" /> : <p className="text-lg font-black text-primary mt-1">₹{formData.rentPerBed}</p>}
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-borderLight">
                  <p className="text-[10px] text-textMuted uppercase font-bold">Deposit</p>
                  {isEditing ? <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleInputChange} className="w-full bg-slate-100 p-1 text-textDark text-sm" /> : <p className="text-lg font-black text-emerald-400 mt-1">₹{formData.securityDeposit}</p>}
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-borderLight">
                  <p className="text-[10px] text-textMuted uppercase font-bold">Discount</p>
                  {isEditing ? <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} className="w-full bg-slate-100 p-1 text-textDark text-sm" /> : <p className="text-lg font-black text-blue-400 mt-1">₹{formData.discount || 0}</p>}
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-borderLight">
                  <p className="text-[10px] text-textMuted uppercase font-bold">Pending Amount</p>
                  <p className="text-lg font-black text-rose-400 mt-1">₹{bedData.pendingAmount || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-borderLight">
                <div>
                  <p className="text-[10px] text-textMuted uppercase font-bold">Next Due Date</p>
                  {isEditing ? <input type="date" name="nextDueDate" value={formData.nextDueDate} onChange={handleInputChange} className="mt-1 bg-slate-100 text-textDark text-xs p-1" /> : <p className="text-sm font-bold text-textDark mt-1">{formData.nextDueDate}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(bedData.paymentStatus)}`}>
                    {bedData.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Payment Ledger Table */}
              <div>
                <h4 className="text-xs font-extrabold text-textDark uppercase tracking-wider mb-3">Payment Ledger</h4>
                {payments.length === 0 ? (
                  <div className="p-6 text-center border border-borderLight border-dashed rounded-xl bg-slate-50">
                    <p className="text-sm text-textMuted">No payment records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-borderLight rounded-xl">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-white border-b border-borderLight">
                        <tr>
                          <th className="p-3 text-textMuted font-bold uppercase">Date</th>
                          <th className="p-3 text-textMuted font-bold uppercase">Amount</th>
                          <th className="p-3 text-textMuted font-bold uppercase">Mode</th>
                          <th className="p-3 text-textMuted font-bold uppercase">Status</th>
                          <th className="p-3 text-textMuted font-bold uppercase text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-white">
                        {payments.map(p => (
                          <tr key={p._id}>
                            <td className="p-3 text-textMuted">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="p-3 font-bold text-emerald-400">₹{p.totalAmount || p.amount || 0}</td>
                            <td className="p-3 text-textMuted">{p.paymentMethod}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${p.verificationStatus === 'Verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{p.verificationStatus}</span>
                            </td>
                            <td className="p-3 text-right">
                              <button onClick={() => alert('Downloading receipt...')} className="text-primary hover:text-indigo-300">
                                <Download className="w-4 h-4 ml-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE & COMPLAINTS */}
          {bedData.occupied && activeTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Complaints Table */}
              <div>
                <h4 className="text-xs font-extrabold text-textDark uppercase tracking-wider mb-3">Recent Complaints</h4>
                {complaints.length === 0 ? (
                  <div className="p-6 text-center border border-borderLight border-dashed rounded-xl bg-slate-50">
                    <p className="text-sm text-textMuted">No complaints registered.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {complaints.map(c => (
                      <div key={c._id} className="p-3 rounded-lg border border-borderLight bg-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-textDark">{c.title}</p>
                          <p className="text-[10px] text-textMuted mt-0.5">{new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-extrabold text-textDark uppercase tracking-wider mb-3">Activity Timeline</h4>
                <div className="space-y-4 pl-2 border-l-2 border-borderLight ml-2">
                  {(bedData.activityTimeline || [
                    { title: 'Admitted to PG', description: `Room ${bedData.roomNumber}, Cot ${bedData.bedNumber}`, date: bedData.joiningDate || 'Unknown' }
                  ]).map((event, idx) => (
                    <div key={idx} className="relative pl-4">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-[#0b1120]" />
                      <p className="text-[10px] font-bold text-primary">{event.date}</p>
                      <p className="text-xs font-bold text-textDark mt-0.5">{event.title}</p>
                      <p className="text-[11px] text-textMuted mt-0.5">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminBedManagementDrawer;
