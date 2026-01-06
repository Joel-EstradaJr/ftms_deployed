import React, { useState, useMemo } from "react";
import PaginationComponent from "./pagination";
import Loading from "./loading";
import "../styles/components/busSelector.css"
import "../styles/components/table.css"
import { formatDateTime } from '../utils/formatting';
import ModalHeader from './ModalHeader';

type Trip = {
  id: number;
  busPlateNumber: string;
  body_number: string;
  bus_type: string;
  route: string;
  date_assigned: string;
  departmentId: number;
  departmentName: string;
};

type TripSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (trip: Trip) => void;
  trips: Trip[];
};

const DEFAULT_PAGE_SIZE = 10;

const TripSelectorModal: React.FC<TripSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  trips,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);

  // Filter trips
  const filteredTrips = useMemo(() => {
    let filtered = [...trips];
    
    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(t =>
        t.body_number?.toLowerCase().includes(search.toLowerCase()) ||
        t.route.toLowerCase().includes(search.toLowerCase()) ||
        t.busPlateNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered.sort(
      (a, b) => new Date(b.date_assigned || 0).getTime() - new Date(a.date_assigned || 0).getTime()
    );
  }, [trips, search]);

  const totalPages = Math.ceil(filteredTrips.length / pageSize || 1);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Helper to format bus type correctly
  const formatBusType = (busType: string | null): string => {
    if (!busType) return 'N/A';
    
    const normalizedType = busType.toLowerCase();
    if (normalizedType === 'aircon' || normalizedType === 'airconditioned' || normalizedType === 'air-con') {
      return 'Air-Con';
    } else if (normalizedType === 'nonaircon' || normalizedType === 'ordinary') {
      return 'Ordinary';
    } else if (normalizedType === 'deluxe') {
      return 'Deluxe';
    } else {
      return busType.charAt(0).toUpperCase() + busType.slice(1);
    }
  };

  if (!isOpen) return null;

  // View Trip Details Modal
  if (viewingTrip) {
    return (
      <div className="modalOverlay">
        <div className="addExpenseModal" style={{ maxWidth: '600px' }}>
          <ModalHeader title="Trip Details" onClose={() => setViewingTrip(null)} />
          <div className="modalContent">
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px', fontSize: '14px' }}>
                  <div style={{ fontWeight: '600', color: '#555' }}>Trip ID:</div>
                  <div>{viewingTrip.id}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Date Assigned:</div>
                  <div>{viewingTrip.date_assigned ? formatDateTime(viewingTrip.date_assigned) : 'N/A'}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Plate Number:</div>
                  <div>{viewingTrip.busPlateNumber || 'N/A'}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Body Number:</div>
                  <div>{viewingTrip.body_number || 'N/A'}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Type:</div>
                  <div>{formatBusType(viewingTrip.bus_type)}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Route:</div>
                  <div>{viewingTrip.route}</div>
                  
                  <div style={{ fontWeight: '600', color: '#555' }}>Department:</div>
                  <div>{viewingTrip.departmentName}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  className="cancel-btn" 
                  onClick={() => setViewingTrip(null)}
                  style={{ padding: '8px 20px' }}
                >
                  Close
                </button>
                <button 
                  className="submit-btn" 
                  onClick={() => {
                    onSelect(viewingTrip);
                    setViewingTrip(null);
                    onClose();
                  }}
                  style={{ padding: '8px 20px' }}
                >
                  Select This Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <ModalHeader title="Select Trip for Expense" onClose={onClose} />
        <div className="modalContent">
          <input
            type="text"
            placeholder="Search by body number, plate, or route..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="formInput"
            style={{ marginBottom: 12, width: "100%" }}
          />
          {isLoading ? (
            <Loading />
          ) : (
            <div className="tableContainer">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Assigned</th>
                    <th>Body Number</th>
                    <th>Type</th>
                    <th>Route</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center" }}>
                        No trips found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTrips.map((trip) => {
                      return (
                        <tr key={trip.id}>
                          <td>
                            {trip.date_assigned ? 
                              formatDateTime(trip.date_assigned)
                                .split("(")
                                .map((part, index) =>
                                  index === 0 ? (
                                    <div key={index}>{part.trim()}</div>
                                  ) : (
                                    <div key={index}>({part}</div>
                                  )
                                )
                              : 'N/A'
                            }
                          </td>
                          <td>{trip.body_number || 'N/A'}</td>
                          <td>{formatBusType(trip.bus_type)}</td>
                          <td>{trip.route}</td>
                          <td className="actionButtons">
                            <div className="actionButtonsContainer">
                              <button
                                className="viewBtn"
                                onClick={() => setViewingTrip(trip)}
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>
    </div>
  );
};

export default TripSelectorModal;
