import React, { useEffect, useState } from 'react';
import { api } from '../../../utils/api';
import toast from 'react-hot-toast';

export default function AdminVendorRequests() {
  const [vendorReqs, setVendorReqs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVendorReqs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendor-participations/all', {
        params: {
          limit: 50,
          populate: 'vendorProfile,event',
        },
      });
      setVendorReqs(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load vendor requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorReqs();
  }, []);

  const acceptVendor = async (id) => {
    try {
      await api.patch(`/vendor-participations/${id}/accept`);
      toast.success('Vendor request accepted');
      loadVendorReqs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept vendor request');
    }
  };

  const rejectVendor = async (id) => {
    try {
      await api.patch(`/vendor-participations/${id}/reject`);
      toast.success('Vendor request rejected');
      loadVendorReqs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject vendor request');
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Vendor Requests (Pending)</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {vendorReqs.filter(r => r.status === 'PENDING').length === 0 && (
            <li className="text-gray-400">No pending vendor requests.</li>
          )}
          {vendorReqs.filter(r => r.status === 'PENDING').map(r => (
            <li key={r._id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{r.kind} — {r.vendorProfile?.companyName || 'Vendor'}</div>
                  <div className="text-xs text-gray-300 mt-1">
                    <div>Event: {r.event ? r.event.title : 'No event'}</div>
                    <div>Location: {r.mapLocationId || 'Not specified'}</div>
                    <div>Booth Size: {r.boothSize}</div>
                    {r.vendorProfile && (
                      <>
                        <div>Contact: {r.vendorProfile.contactName}</div>
                        <div>Email: {r.vendorProfile.contactEmail}</div>
                        <div>Phone: {r.vendorProfile.contactPhone}</div>
                      </>
                    )}
                    {r.proposedItems && (
                      <div>Products/Services: {r.proposedItems}</div>
                    )}
                    {r.specialRequirements && (
                      <div>Special Requirements: {r.specialRequirements}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => acceptVendor(r._id)}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn"
                    onClick={() => rejectVendor(r._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
