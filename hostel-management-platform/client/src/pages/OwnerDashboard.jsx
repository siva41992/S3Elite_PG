import React, { useState, useEffect } from 'react';
import {
  Users,
  BedDouble,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Search,
  Filter,
  RefreshCw,
  Building2,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Edit3,
  Save,
  X,
  ExternalLink,
  MessageSquare,
  Wrench,
  TrendingUp,
  MapPin,
  Calendar,
  Briefcase,
  Sparkles,
  Download,
  Phone,
  Send,
  Eye,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { io } from 'socket.io-client';
import { realtimeBus } from '../utils/realtimeBus';
import AdminBedManagementDrawer from '../components/AdminBedManagementDrawer';
import AdminSettings from '../components/AdminSettings';
import {
  exportPGReport,
  exportMessReport,
  exportCombinedReport,
  exportContactList,
  exportDefaultersList,
  exportOccupancyReport,
  exportRevenueReport
} from '../utils/excelReportGenerator';

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'matrix' | 'payments'
  const [filterFloor, setFilterFloor] = useState('All');
  const [paymentFilterTab, setPaymentFilterTab] = useState('All'); // 'All' | 'Pending' | 'Verified' | 'Overdue' | 'Today' | 'Monthly'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedBedDrawer, setSelectedBedDrawer] = useState(null);

  // Live MongoDB data states (NO DUMMY DATA)
  const [stats, setStats] = useState({
    totalStudents: 0,
    occupiedBeds: 0,
    vacantBeds: 0,
    reservedBeds: 0,
    totalBeds: 0,
    todaysRevenue: 0,
    monthlyRevenue: 0,
    expectedRevenue: 0,
    collectedRevenue: 0,
    pendingRevenue: 0,
    overdueStudents: 0,
    pendingPaymentsCount: 0,
    verifiedPaymentsCount: 0,
    pendingComplaintsCount: 0,
    resolvedComplaintsCount: 0
  });

  const [matrixBeds, setMatrixBeds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [rentRenewals, setRentRenewals] = useState([]);
  const [messSubscribers, setMessSubscribers] = useState([]);
  const [paymentVerifications, setPaymentVerifications] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const getImageUrl = (path) => {
    if (!path) return null;
    let normalized = path.replace(/\\/g, '/');
    if (normalized.startsWith('uploads/')) {
      normalized = normalized.replace('uploads/', '/api/uploads/');
    } else if (normalized.startsWith('/uploads/')) {
      normalized = normalized.replace('/uploads/', '/api/uploads/');
    } else if (!normalized.startsWith('http') && !normalized.startsWith('/api/')) {
      normalized = `/api/uploads/${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
    }
    return normalized;
  };


  // Fetch all real-time data strictly from MongoDB API
  
  const adminToken = JSON.parse(localStorage.getItem('s3elite_admin'))?.token;

  const apiFetch = async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${adminToken}` };
    const response = await fetch(url, { ...options, headers });
    
    // Auto-logout if token is expired or invalid
    if (response.status === 401) {
      localStorage.removeItem('s3elite_admin');
      window.location.reload();
    }
    return response;
  };

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [
        statsRes,
        matrixRes,
        payRes,
        bookRes,
        rentRes,
        messRes,
        verifRes,
        complaintsRes
      ] = await Promise.all([
        apiFetch('/api/admin/erp/stats'),
        apiFetch('/api/admin/erp/matrix'),
        apiFetch('/api/admin/erp/payments'),
        apiFetch('/api/admin/erp/booking-requests'),
        apiFetch('/api/admin/erp/rent-renewals'),
        apiFetch('/api/admin/erp/mess-subscribers'),
        apiFetch('/api/admin/erp/payment-verifications'),
        apiFetch('/api/complaints')
      ]);

      // Process responses
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success && statsJson.data) setStats(statsJson.data);
      }
      
      if (matrixRes.ok) {
        const matrixJson = await matrixRes.json();
        if (matrixJson.success && Array.isArray(matrixJson.data)) setMatrixBeds(matrixJson.data);
      }
      
      if (payRes.ok) {
        const payJson = await payRes.json();
        if (payJson.success && Array.isArray(payJson.data)) setPayments(payJson.data);
      }
      
      let serverBookings = [];
      if (bookRes.ok) {
        const bookJson = await bookRes.json();
        if (bookJson.success && Array.isArray(bookJson.data)) serverBookings = bookJson.data;
      }
      try {
        const offlineBookings = JSON.parse(localStorage.getItem('s3elite_offline_bookings') || '[]');
        const combined = [...serverBookings];
        offlineBookings.forEach(off => {
          if (!combined.some(b => b.utrNumber === off.utrNumber || b.applicationId === off.applicationId)) {
            combined.unshift(off);
          }
        });
        setBookingRequests(combined);
      } catch (e) {
        setBookingRequests(serverBookings);
      }

      if (rentRes && rentRes.ok) {
        const rentJson = await rentRes.json();
        if (rentJson.success && Array.isArray(rentJson.data)) setRentRenewals(rentJson.data);
      }
      
      if (messRes.ok) {
        const messJson = await messRes.json();
        if (messJson.success && Array.isArray(messJson.data)) setMessSubscribers(messJson.data);
      }

      if (verifRes.ok) {
        const verifJson = await verifRes.json();
        if (verifJson.success && Array.isArray(verifJson.data)) setPaymentVerifications(verifJson.data);
      }

      if (complaintsRes && complaintsRes.ok) {
        const complaintsJson = await complaintsRes.json();
        if (complaintsJson.success && Array.isArray(complaintsJson.data)) setComplaints(complaintsJson.data);
      }


    } catch (err) {
      console.error('Error loading MongoDB data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Socket.IO Real-Time live listener
  useEffect(() => {
    fetchDashboardData();

    // Connect to backend Socket.IO directly on Render
    const RENDER_BACKEND_URL = 'https://s3elite-pg-final.onrender.com';
    const socket = io(RENDER_BACKEND_URL, { transports: ['polling', 'websocket'] });
    const handleSync = (data) => {
      console.log('[Socket.IO] Real-Time MongoDB update received in Dashboard:', data);
      fetchDashboardData(true);
    };
    socket.on('ERP_EVENT', handleSync);
    socket.on('BED_RESERVED', handleSync);

    // Also subscribe to local realtimeBus
    const unsubscribe = realtimeBus.subscribe(() => {
      fetchDashboardData(true);
    });

    return () => {
      socket.disconnect();
      unsubscribe();
    };
  }, []);



  // Payment Verification Actions
  const handleVerifyPayment = async (paymentId) => {
    try {
      const res = await apiFetch(`/api/admin/erp/payments/${paymentId}/verify`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      const res = await apiFetch(`/api/admin/erp/payments/${paymentId}/reject`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
    }
  };

  const handleVerifyApplicationPayment = async (type, id) => {
    if (type === 'Rent Renewal') return handleVerifyRentRenewal(id);
    
    setProcessingId(id);
    try {
      const apiType = type === 'PG Booking' ? 'Booking' : 'Mess';
      const res = await apiFetch(`/api/admin/erp/payment-verifications/${apiType}/${id}/verify`, { method: 'PUT' });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error verifying payment');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectApplicationPayment = async (type, id) => {
    if (type === 'Rent Renewal') return handleRejectRentRenewal(id);

    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    
    setProcessingId(id);
    try {
      const apiType = type === 'PG Booking' ? 'Booking' : 'Mess';
      const res = await apiFetch(`/api/admin/erp/payment-verifications/${apiType}/${id}/reject`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error rejecting payment');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };
  const handleVerifyRentRenewal = async (id) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/admin/erp/rent-renewals/${id}/verify`, { method: 'PUT' });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error verifying rent renewal');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRentRenewal = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/admin/erp/rent-renewals/${id}/reject`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error rejecting rent renewal');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };


  const handleSendWhatsAppReminder = (pay) => {
    const message = `Hello ${pay.studentName || 'Student'},\n\nThis is a gentle reminder regarding your payment of ₹${pay.totalAmount || pay.amount} for Room ${pay.roomNumber}, Cot ${pay.bedNumber} at S3 Elite PG.\n\nPlease process the payment at your earliest convenience or contact the admin if you have any questions.\n\nThank you,\nS3 Elite PG Admin`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadReceipt = (pay) => {
    const receiptContent = `
      <html>
        <head>
          <title>Receipt ${pay.receiptNumber || 'REC-XXXX'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; }
            .header h1 { color: #f97316; margin: 0 0 5px 0; font-size: 28px; font-weight: 900; }
            .header p { color: #64748b; margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-size: 14px; }
            .row strong { color: #475569; }
            .row span { font-weight: 600; text-align: right; }
            .total-row { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 18px; font-weight: 900; color: #0f172a; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; font-weight: 500; }
            @media print {
              body { background: white; padding: 0; }
              .container { box-shadow: none; border: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>S3 Elite PG</h1>
              <p>Official Payment Receipt</p>
            </div>
            <div class="row"><strong>Receipt No:</strong> <span>${pay.receiptNumber || `REC-${pay._id.slice(-6).toUpperCase()}`}</span></div>
            <div class="row"><strong>Date:</strong> <span>${new Date(pay.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div class="row"><strong>Student Name:</strong> <span>${pay.studentName || 'N/A'}</span></div>
            <div class="row"><strong>Room / Bed:</strong> <span>Room ${pay.roomNumber} - Cot ${pay.bedNumber}</span></div>
            <div class="row"><strong>Payment Type:</strong> <span>${pay.paymentType || 'Initial PG Booking'}</span></div>
            <div class="row"><strong>Billing Period:</strong> <span>${pay.billingPeriod || pay.monthYear || 'N/A'}</span></div>
            <div class="row"><strong>Payment Method:</strong> <span>${pay.paymentMethod || 'UPI'}</span></div>
            <div class="row"><strong>Transaction ID:</strong> <span>${pay.transactionId || pay.utrNumber || 'N/A'}</span></div>
            <div class="row"><strong>Status:</strong> <span style="color: #10b981;">${pay.verificationStatus || pay.status || 'Verified'}</span></div>
            
            <div class="total-row">
              <span>Total Amount Paid:</span>
              <span>₹${pay.totalAmount?.toLocaleString() || pay.amount?.toLocaleString()}</span>
            </div>

            <div class="footer">
              <p>This is a computer-generated receipt and does not require a physical signature.</p>
              <p>© ${new Date().getFullYear()} S3 Elite PG. All rights reserved.</p>
            </div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `;
    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleOpenBedDrawer = async (bed) => {
    if (!bed.occupied && bed.reservationStatus !== 'Occupied') return;
    try {
      if (bed._id) {
        const res = await apiFetch(`/api/admin/erp/bed/${bed._id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSelectedBedDrawer(json.data);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching full bed profile:', err);
    }
    // Fallback if fetch fails but bed is passed
    setSelectedBedDrawer(bed);
  };

  const handleApproveBooking = async (id) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/admin/erp/booking-requests/${id}/approve`, { method: 'PUT' });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error approving booking');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBooking = async (id) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/admin/erp/booking-requests/${id}/reject`, { method: 'PUT' });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || 'Error rejecting booking');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateMessStatus = async (id, status) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/admin/erp/mess-subscribers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || `Error updating status to ${status}`);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateComplaintStatus = async (id, status) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchDashboardData(true);
      } else {
        const json = await res.json();
        alert(json.message || `Error updating status to ${status}`);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  // Group real matrix beds by floor & room
  const groupedRooms = matrixBeds
    .filter((b) => b.floorName !== 'Special Block' && (filterFloor === 'All' || b.floorName === filterFloor))
    .reduce((acc, bed) => {
      if (!acc[bed.roomNumber]) {
        acc[bed.roomNumber] = {
          roomNumber: bed.roomNumber,
          floorName: bed.floorName || '1st Floor',
          beds: []
        };
      }
      acc[bed.roomNumber].beds.push(bed);
      return acc;
    }, {});

  // Real-time search filter
  const filteredRooms = Object.values(groupedRooms).filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchRoom = room.roomNumber.toLowerCase().includes(q);
    const matchBed = room.beds.some(
      (b) =>
        (b.studentName && b.studentName.toLowerCase().includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.studentId && b.studentId.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q))
    );
    return matchRoom || matchBed;
  });

  // Filtered Payments by tab & search
  const filteredPayments = payments.filter((p) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.studentName && p.studentName.toLowerCase().includes(q);
      const utrMatch = p.utrNumber && p.utrNumber.toLowerCase().includes(q);
      const roomMatch = p.roomNumber && p.roomNumber.toLowerCase().includes(q);
      if (!nameMatch && !utrMatch && !roomMatch) return false;
    }

    // Payment tab match
    if (paymentFilterTab === 'Pending') return p.verificationStatus === 'Pending Verification';
    if (paymentFilterTab === 'Verified') return p.verificationStatus === 'Verified';
    if (paymentFilterTab === 'Overdue') return p.status === 'Overdue';
    if (paymentFilterTab === 'Today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      return p.createdAt && p.createdAt.slice(0, 10) === todayStr;
    }
    if (paymentFilterTab === 'Monthly') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      return p.createdAt && p.createdAt.slice(0, 7) === currentMonth;
    }
    return true;
  });

  // Filtered Rent Renewals
  const [rentRenewalFilterTab, setRentRenewalFilterTab] = useState('Pending'); // 'Pending' | 'Verified' | 'Rejected' | 'All'
  const filteredRentRenewals = rentRenewals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = r.residentName && r.residentName.toLowerCase().includes(q);
    const roomMatch = r.roomNumber && r.roomNumber.toLowerCase().includes(q);
    const utrMatch = r.utrNumber && r.utrNumber.toLowerCase().includes(q);
    return nameMatch || roomMatch || utrMatch;
  }).filter((r) => {
    if (rentRenewalFilterTab === 'Pending') return r.verificationStatus === 'Pending Verification';
    if (rentRenewalFilterTab === 'Verified') return r.verificationStatus === 'Verified';
    if (rentRenewalFilterTab === 'Rejected') return r.verificationStatus === 'Rejected';
    return true;
  });

  // Filtered Booking Requests
  const filteredBookings = bookingRequests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = req.name && req.name.toLowerCase().includes(q);
    const phoneMatch = req.phone && req.phone.includes(q);
    const emailMatch = req.email && req.email.toLowerCase().includes(q);
    const roomMatch = req.preferredRoom && req.preferredRoom.toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch || roomMatch;
  });

  // Filtered Mess Subscribers
  const filteredMessSubscribers = messSubscribers.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = sub.name && sub.name.toLowerCase().includes(q);
    const phoneMatch = sub.phone && sub.phone.includes(q);
    const emailMatch = sub.email && sub.email.toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch;
  });

  // Filtered Complaints
  const filteredComplaints = complaints.filter((comp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = comp.title && comp.title.toLowerCase().includes(q);
    const roomMatch = comp.roomNumber && comp.roomNumber.toLowerCase().includes(q);
    const idMatch = comp.ticketId && comp.ticketId.toLowerCase().includes(q);
    return titleMatch || roomMatch || idMatch;
  });


  // Status Badge Helper
  const renderPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Paid</span>;
      case 'Due Today':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Due Today</span>;
      case 'Due Tomorrow':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">Due Tomorrow</span>;
      case 'Overdue':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Overdue</span>;
      case 'Advance Paid':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Advance Paid</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-textMuted border border-borderLight">{status || 'Pending'}</span>;
    }
  };

  // Bed color helper based on MongoDB real status
  const getBedCardClass = (bed) => {
    if (bed.occupied || bed.reservationStatus === 'Occupied') {
      return 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700 shadow-sm'; // Red = Occupied
    }
    if (bed.reservationStatus === 'Reserved') {
      return 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700 shadow-sm'; // Yellow = Reserved
    }
    if (bed.reservationStatus === 'Maintenance') {
      return 'bg-slate-100 border-slate-200 text-slate-500 shadow-sm'; // Grey = Maintenance
    }
    return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 shadow-sm'; // Green = Available
  };

  return (
    <div className="min-h-screen bg-bgLight text-textDark pb-12">
      {/* Sticky White Navbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-borderLight shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-textDark flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-primary shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            S3 Elite PG <span className="text-primary">Enterprise ERP</span>
          </h1>
        </div>

        {/* Global Search & Refresh */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              placeholder="Search student, room, bed, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-50 border border-borderLight text-xs text-textDark placeholder:text-textMuted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-borderLight hover:bg-slate-50 text-xs font-bold transition-all shadow-sm text-textDark hover:-translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          
          <div 
            className="hidden md:flex items-center gap-3 pl-4 border-l border-borderLight cursor-pointer hover:opacity-80 transition-opacity group"
            onClick={() => setActiveTab('settings')}
            title="Open Admin Settings"
          >
            <div className="text-right">
              <p className={`text-xs font-bold transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-textDark group-hover:text-primary'}`}>Admin User</p>
              <p className="text-[10px] font-bold text-primary">ERP Manager</p>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${activeTab === 'settings' ? 'bg-orange-50 border-orange-200' : 'bg-slate-100 border-borderLight group-hover:bg-orange-50 group-hover:border-orange-200'}`}>
              <UserCheck className={`w-4 h-4 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-textMuted group-hover:text-primary'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Real-Time Dashboard KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Total Students</p>
              <Users className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-textDark">{stats.totalStudents}</p>
            <p className="text-[9px] text-emerald-500 font-bold mt-1">✓ Active</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Occupied Beds</p>
              <BedDouble className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-rose-500">{stats.occupiedBeds}</p>
            <p className="text-[9px] text-textMuted font-bold mt-1">Out of {stats.totalBeds}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Vacant Beds</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-emerald-500">{stats.vacantBeds}</p>
            <p className="text-[9px] text-textMuted font-bold mt-1">Ready to book</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Reserved</p>
              <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-amber-500">{stats.reservedBeds}</p>
            <p className="text-[9px] text-amber-500 font-bold mt-1">Pending payments</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Today's Rev</p>
              <DollarSign className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-textDark">₹{stats.todaysRevenue.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-500 font-bold mt-1">+ Today</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Collected</p>
              <TrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-textDark">₹{stats.collectedRevenue.toLocaleString()}</p>
            <p className="text-[9px] text-textMuted font-bold mt-1">This month</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border-l-4 border-rose-500 shadow-sm hover:-translate-y-1 transition-transform group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-textMuted uppercase">Overdue</p>
              <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-black text-rose-500">{stats.overdueStudents}</p>
            <p className="text-[9px] text-rose-500 font-bold mt-1">Requires action</p>
          </div>
        </div>

        {/* Additional ERP Row Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Expected Rev</p>
            <p className="text-xl font-black text-textDark">₹{stats.expectedRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border-l-4 border-amber-400 shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Pending Rev</p>
            <p className="text-xl font-black text-amber-500">₹{stats.pendingRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Monthly Rev</p>
            <p className="text-xl font-black text-textDark">₹{stats.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border-l-4 border-amber-400 shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Pending UTRs</p>
            <p className="text-xl font-black text-amber-500">{stats.pendingPaymentsCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Verified UTRs</p>
            <p className="text-xl font-black text-emerald-500">{stats.verifiedPaymentsCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border-l-4 border-orange-400 shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Open Complaints</p>
            <p className="text-xl font-black text-orange-500">{stats.pendingComplaintsCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-bold text-textMuted uppercase mb-1">Resolved</p>
            <p className="text-xl font-black text-textDark">{stats.resolvedComplaintsCount}</p>
          </div>
        </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-borderLight pb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Room Matrix ({matrixBeds.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Payment Ledger ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'bookings'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Booking Requests ({filteredBookings.filter(r => r.status === 'Pending').length})
        </button>
        <button
          onClick={() => setActiveTab('rent-renewals')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'rent-renewals'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Rent Renewals ({rentRenewals.filter(r => r.verificationStatus === 'Pending Verification').length})
        </button>
        <button
          onClick={() => setActiveTab('mess')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'mess'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Monthly Mess ({filteredMessSubscribers.filter(r => r.status === 'Pending').length})
        </button>
        <button
          onClick={() => setActiveTab('payment-verifications')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'payment-verifications'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Payment Verification ({paymentVerifications.filter(p => p.paymentStatus === 'Pending Verification').length})
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'complaints'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'bg-white text-textMuted hover:text-textDark border border-borderLight hover:bg-slate-50'
          }`}
        >
          Complaints ({filteredComplaints.filter(c => c.status === 'Open').length})
        </button>

        {/* Export Reports Dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="px-5 py-2 rounded-full text-xs font-bold transition-all bg-primary text-white shadow-md shadow-primary/20 hover:bg-orange-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Reports <ChevronDown className="w-3 h-3 ml-1" />
          </button>
          
          {exportDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setExportDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-2 space-y-1">
                  <button onClick={() => { exportPGReport({ matrixBeds, stats }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    📥 Download PG Report
                  </button>
                  <button onClick={() => { exportMessReport({ messSubscribers, stats }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    📥 Download Monthly Mess Report
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-2" />
                  <button onClick={() => { exportCombinedReport({ matrixBeds, messSubscribers, stats }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    📊 Download Combined Report
                  </button>
                  <button onClick={() => { exportContactList({ matrixBeds }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    📄 Download Contact List
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-2" />
                  <button onClick={() => { exportDefaultersList({ matrixBeds }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors flex items-center gap-2">
                    ⚠ Download Defaulters List
                  </button>
                  <button onClick={() => { exportOccupancyReport({ matrixBeds, stats }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    🛏 Occupancy Report
                  </button>
                  <button onClick={() => { exportRevenueReport({ stats }); setExportDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                    💰 Revenue Report
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: REAL-TIME ROOM & BED MANAGEMENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Floor Legend & Filters */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-textMuted">Layout Floor:</span>
              {['All', 'Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'].map((floor) => (
                <button
                  key={floor}
                  onClick={() => setFilterFloor(floor)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filterFloor === floor
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white border border-borderLight text-textMuted hover:text-textDark hover:bg-slate-50'
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span> Available
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span> Occupied
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span> Reserved
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Maintenance
              </span>
            </div>
          </div>

          {/* Rooms Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map((room) => (
              <div
                key={room.roomNumber}
                className="p-5 rounded-2xl bg-white border border-borderLight shadow-sm space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between border-b border-borderLight/60 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-textDark flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Room {room.roomNumber.replace('SB', 'S')}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-textMuted mt-1 block">
                      {room.floorName}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-borderLight text-textDark">
                    {room.beds.filter((b) => b.occupied).length} / {room.beds.length} Occupied
                  </span>
                </div>

                {/* Beds inside Room */}
                <div className="grid grid-cols-2 gap-3">
                  {room.beds.map((bed) => {
                    const cardStyle = getBedCardClass(bed);
                    return (
                      <div
                        key={bed._id}
                        onClick={() => handleOpenBedDrawer(bed)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between min-h-[5rem] group hover:-translate-y-0.5 ${cardStyle}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-black">Cot {bed.bedNumber}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                           {bed.occupied ? (
                             <>
                               <div className="w-4 h-4 rounded bg-rose-200/50 flex items-center justify-center shrink-0">
                                 <UserCheck className="w-2.5 h-2.5 text-rose-700" />
                               </div>
                               <span className="text-[10px] font-bold truncate opacity-90">{bed.studentName || 'Somu'}</span>
                             </>
                           ) : bed.reservationStatus === 'Reserved' ? (
                             <>
                               <div className="w-4 h-4 rounded bg-amber-200/50 flex items-center justify-center shrink-0">
                                 <Clock className="w-2.5 h-2.5 text-amber-700" />
                               </div>
                               <span className="text-[10px] font-bold truncate opacity-90">Reserved</span>
                             </>
                           ) : bed.reservationStatus === 'Maintenance' ? (
                             <>
                               <div className="w-4 h-4 rounded bg-slate-200/50 flex items-center justify-center shrink-0">
                                 <Wrench className="w-2.5 h-2.5 text-slate-600" />
                               </div>
                               <span className="text-[10px] font-bold truncate opacity-90">Maintenance</span>
                             </>
                           ) : (
                             <>
                               <div className="w-4 h-4 rounded bg-emerald-200/50 flex items-center justify-center shrink-0">
                                 <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                               </div>
                               <span className="text-[10px] font-bold truncate opacity-90">Available</span>
                             </>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTION PAYMENT MANAGEMENT SYSTEM */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {['All', 'Pending', 'Verified', 'Overdue', 'Today', 'Monthly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPaymentFilterTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  paymentFilterTab === tab
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white border border-borderLight text-textMuted hover:text-textDark hover:bg-slate-50'
                }`}
              >
                {tab === 'All' ? 'All Payments' : `${tab} Payments`}
              </button>
            ))}
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl bg-white border border-borderLight overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderLight bg-slate-50 text-[11px] font-bold uppercase text-textMuted tracking-wider">
                    <th className="p-4">Student</th>
                    <th className="p-4">Room / Bed</th>
                    <th className="p-4">Payment Type</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4">Billing Period</th>
                    <th className="p-4">Payment Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">UTR Number</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight/60 text-sm font-medium">
                  {filteredPayments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-textDark border border-borderLight">
                            {pay.studentName?.slice(0, 2)?.toUpperCase() || 'ST'}
                          </div>
                          <div>
                            <p className="font-bold text-textDark text-sm">{pay.studentName}</p>
                            <p className="text-[10px] font-semibold text-textMuted uppercase mt-0.5">{pay.paymentMethod || 'UPI'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="font-bold text-primary text-sm">Room {pay.roomNumber}</div>
                         <div className="text-[10px] font-semibold text-textMuted uppercase mt-0.5">Cot {pay.bedNumber}</div>
                      </td>
                      <td className="p-4 font-bold text-textDark text-xs">{pay.paymentType || 'Initial PG Booking'}</td>
                      <td className="p-4 font-black text-textDark">₹{pay.totalAmount?.toLocaleString() || pay.amount?.toLocaleString()}</td>
                      <td className="p-4 text-textMuted font-semibold text-xs">{pay.billingPeriod || pay.monthYear}</td>
                      <td className="p-4 text-textMuted text-xs flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {new Date(pay.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-4">{renderPaymentStatusBadge(pay.verificationStatus || pay.status || 'Verified')}</td>
                      <td className="p-4 font-mono text-textDark font-bold text-xs">{pay.utrNumber}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendWhatsAppReminder(pay)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-textMuted border border-borderLight transition-all shadow-sm"
                            title="Send WhatsApp Reminder"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-500" />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(pay)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-textMuted border border-borderLight transition-all shadow-sm"
                            title="Download Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                     <tr>
                       <td colSpan="9" className="p-8 text-center text-textMuted text-sm">
                         No payments found.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKING REQUESTS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-borderLight overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderLight bg-slate-50">
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Applicant Name</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Contact</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Requested Bed</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight/60">
                  {filteredBookings.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-textDark text-sm">{req.name}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5">
                          {req.collegeCompany || 'N/A'} • {req.stayDuration ? `${req.stayDuration}` : 'Duration N/A'}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-textMuted">
                        <div>{req.phone}</div>
                        <div className="mt-0.5">{req.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-primary">Room {req.preferredRoom}</div>
                        <div className="text-[11px] font-semibold text-textMuted uppercase mt-0.5">Cot {req.preferredBed}</div>
                      </td>
                      <td className="p-4">
                        {req.status === 'Pending' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>}
                        {req.status === 'Approved' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>}
                        {req.status === 'Rejected' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-600 border border-rose-200">Rejected</span>}
                      </td>
                      <td className="p-4 text-right">
                        {req.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApproveBooking(req._id)}
                              disabled={processingId === req._id}
                              className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${
                                processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {processingId === req._id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectBooking(req._id)}
                              disabled={processingId === req._id}
                              className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${
                                processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-textMuted text-sm">
                        No booking requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.5: RENT RENEWALS */}
      {activeTab === 'rent-renewals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-textDark">Rent Renewals</h2>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-borderLight shadow-sm">
              {['Pending', 'Verified', 'Rejected', 'All'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRentRenewalFilterTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rentRenewalFilterTab === tab
                      ? 'bg-white text-primary shadow-sm border border-borderLight'
                      : 'text-textMuted hover:text-textDark hover:bg-white/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-borderLight shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-borderLight">
                    <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Resident</th>
                    <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Room/Cot</th>
                    <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Amount / UTR</th>
                    <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Dates & Status</th>
                    <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight/60">
                  {filteredRentRenewals.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-textDark text-sm">{req.residentName}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5">
                          {req.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-primary">Room {req.roomNumber}</div>
                        <div className="text-[11px] font-semibold text-textMuted uppercase mt-0.5">Cot {req.bedNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-textDark">₹{req.amount}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5 font-mono">
                          {req.utrNumber}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[11px] text-textMuted flex flex-col gap-1">
                          <span className="font-bold">Current: <span className="text-textDark">{new Date(req.previousPaidUntil).toLocaleDateString()}</span></span>
                          <span className="font-bold">Proposed: <span className="text-primary">{new Date(req.proposedNewPaidUntil).toLocaleDateString()}</span></span>
                        </div>
                        <div className="mt-2">
                          {req.verificationStatus === 'Pending Verification' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>}
                          {req.verificationStatus === 'Verified' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Verified</span>}
                          {req.verificationStatus === 'Rejected' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-600 border border-rose-200">Rejected</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {req.paymentScreenshot && (
                            <button
                              onClick={() => setPreviewImage({
                                ...req,
                                name: req.residentName,
                                preferredRoom: req.roomNumber,
                                preferredBed: req.bedNumber
                              })}
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View Payment
                            </button>
                          )}
                          {req.verificationStatus === 'Pending Verification' && (
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => handleVerifyRentRenewal(req._id)}
                                disabled={processingId === req._id}
                                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${
                                  processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleRejectRentRenewal(req._id)}
                                disabled={processingId === req._id}
                                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${
                                  processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRentRenewals.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-textMuted text-sm">
                        No rent renewals found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MONTHLY MESS (EXTERNAL SUBSCRIBERS) */}
      {activeTab === 'mess' && (
        <div className="space-y-6">
          {/* Quick Metrics for Mess */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-borderLight shadow-sm hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /> Total Applications</p>
              <p className="text-xl font-black text-textDark mt-1">{filteredMessSubscribers.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border-l-4 border-emerald-500 shadow-sm hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active Subscribers</p>
              <p className="text-xl font-black text-textDark mt-1">{filteredMessSubscribers.filter(s => s.status === 'Active').length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border-l-4 border-amber-500 shadow-sm hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pending Approval</p>
              <p className="text-xl font-black text-textDark mt-1">{filteredMessSubscribers.filter(s => s.status === 'Pending').length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border-l-4 border-rose-500 shadow-sm hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Inactive</p>
              <p className="text-xl font-black text-textDark mt-1">{filteredMessSubscribers.filter(s => s.status === 'Inactive').length}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-borderLight overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderLight bg-slate-50">
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Applicant Name</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Contact</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Plan & Date</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight/60">
                  {filteredMessSubscribers.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-textDark text-sm">{req.name}</div>
                        <div className="text-[10px] text-textMuted font-bold uppercase mt-0.5">{req.mealPreference} • {req.occupation}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5">{req.collegeCompany || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-textMuted">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-textMuted" /> {req.phone}</div>
                        <div className="mt-1 truncate max-w-[150px]">{req.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-primary">{req.plan}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Starts: {new Date(req.startDate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        {req.status === 'Pending' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>}
                        {req.status === 'Active' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>}
                        {req.status === 'Inactive' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-600 border border-rose-200">Inactive</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateMessStatus(req._id, 'Active')}
                                disabled={processingId === req._id}
                                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => handleUpdateMessStatus(req._id, 'Inactive')}
                                disabled={processingId === req._id}
                                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'}`}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === 'Active' && (
                            <button
                              onClick={() => handleUpdateMessStatus(req._id, 'Inactive')}
                              disabled={processingId === req._id}
                              className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'}`}
                            >
                              Pause/Cancel
                            </button>
                          )}
                          {req.status === 'Inactive' && (
                            <button
                              onClick={() => handleUpdateMessStatus(req._id, 'Active')}
                              disabled={processingId === req._id}
                              className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border ${processingId === req._id ? 'bg-slate-50 text-textMuted border-borderLight' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'}`}
                            >
                              Re-Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMessSubscribers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-textMuted text-sm">
                        No external mess subscribers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENT VERIFICATIONS */}
      {activeTab === 'payment-verifications' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-black text-primary">Pending Verifications</h2>
          </div>
          
          <div className="grid gap-4">
            {paymentVerifications.filter(p => p.paymentStatus === 'Pending Verification').map((req) => (
              <div key={req._id} className="bg-white rounded-2xl p-6 border border-borderLight shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 md:items-center justify-between">
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-textDark">{req.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-600 border border-amber-200">
                      {req.applicationType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-textMuted border border-borderLight">
                      {req.applicationId}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">Contact</p>
                      <p className="text-sm font-semibold text-textDark flex items-center gap-1"><Phone className="w-3 h-3 text-textMuted"/> {req.phone}</p>
                    </div>
                    {(req.applicationType === 'PG Booking' || req.applicationType === 'Rent Renewal') && (
                      <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold">Room / Cot</p>
                        <p className="text-sm font-semibold text-textDark">Room {req.preferredRoom.replace('SB', 'S')}, Cot {req.preferredBed}</p>
                      </div>
                    )}
                    {req.applicationType === 'Rent Renewal' && (
                      <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold">Duration</p>
                        <p className="text-sm font-semibold text-textDark">{req.plan}</p>
                      </div>
                    )}
                    {req.applicationType === 'Monthly Mess' && (
                      <div>
                        <p className="text-[10px] text-textMuted uppercase font-bold">Mess Plan</p>
                        <p className="text-sm font-semibold text-textDark">{req.plan}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">UTR Number</p>
                      <p className="text-sm font-black text-emerald-600">{req.utrNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">Screenshot</p>
                      <button onClick={() => setPreviewImage(req)} className="text-primary hover:text-indigo-600 text-xs flex items-center gap-1 mt-1 font-semibold">
                        <ExternalLink className="w-3 h-3" /> View Image
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button
                    onClick={() => handleVerifyApplicationPayment(req.applicationType, req._id)}
                    disabled={processingId === req._id}
                    className="w-full px-4 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200 flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectApplicationPayment(req.applicationType, req._id)}
                    disabled={processingId === req._id}
                    className="w-full px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 flex justify-center items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {paymentVerifications.filter(p => p.paymentStatus === 'Pending Verification').length === 0 && (
              <div className="text-center p-12 bg-white border border-borderLight rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-slate-50 border border-borderLight rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-textMuted font-semibold text-sm">No pending payments to verify.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-orange-500">Complaints Management</h2>
          </div>
          
          <div className="rounded-2xl bg-white border border-borderLight overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderLight bg-slate-50">
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Ticket / Date</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Student & Room</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Issue Details</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[11px] font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight/60">
                  {filteredComplaints.map((comp) => (
                    <tr key={comp._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-primary text-sm">{comp.ticketId}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5">{new Date(comp.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-textDark text-sm">{comp.studentName}</div>
                        <div className="text-[11px] font-semibold text-textMuted mt-0.5 flex items-center gap-1">Room {comp.roomNumber} - {comp.category}</div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-textDark text-sm truncate">{comp.title}</div>
                        <div className="text-[11px] text-textMuted mt-0.5 line-clamp-2">{comp.description}</div>
                      </td>
                      <td className="p-4">
                        {comp.status === 'Open' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-600 border border-rose-200">Open</span>}
                        {comp.status === 'In Progress' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-600 border border-amber-200">In Progress</span>}
                        {comp.status === 'Resolved' && <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Resolved</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {comp.status !== 'Resolved' && (
                            <>
                              {comp.status === 'Open' && (
                                <button
                                  onClick={() => handleUpdateComplaintStatus(comp._id, 'In Progress')}
                                  disabled={processingId === comp._id}
                                  className="px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                                >
                                  Mark In-Progress
                                </button>
                              )}
                              <button
                                onClick={() => handleUpdateComplaintStatus(comp._id, 'Resolved')}
                                disabled={processingId === comp._id}
                                className="px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              >
                                Mark Resolved
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredComplaints.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-textMuted text-sm font-semibold">
                        No complaints found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings */}
      {activeTab === 'settings' && (
        <AdminSettings />
      )}

      {/* Admin Bed Management Drawer */}
      {selectedBedDrawer && (
        <AdminBedManagementDrawer
          bedId={selectedBedDrawer._id}
          isOpen={!!selectedBedDrawer}
          onClose={() => setSelectedBedDrawer(null)}
          onUpdateSuccess={() => fetchDashboardData(true)}
        />
      )}

      {/* Payment Screenshot Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/80">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {previewImage.name ? previewImage.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-textDark">{previewImage.name || 'Applicant'}</h3>
                  <div className="flex gap-3 text-[11px] font-semibold text-textMuted mt-0.5">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> UTR: {previewImage.utrNumber}</span>
                    <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 text-primary" /> Room {previewImage.preferredRoom}, Cot {previewImage.preferredBed}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body (Image) */}
            <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[300px]">
              {getImageUrl(previewImage.paymentScreenshot) ? (
                <img 
                  src={getImageUrl(previewImage.paymentScreenshot)} 
                  alt="Payment Screenshot"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <AlertCircle className="w-12 h-12 opacity-50" />
                  <p className="font-semibold">No payment screenshot available.</p>
                </div>
              )}
              {/* Fallback error container (hidden by default, shown via onError) */}
              <div style={{ display: 'none' }} className="flex-col items-center gap-2 text-red-400">
                <AlertCircle className="w-12 h-12 opacity-50" />
                <p className="font-semibold">Unable to load payment screenshot.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default OwnerDashboard;
