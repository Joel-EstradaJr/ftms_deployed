import React, { useState, useMemo, useEffect } from "react";
import PaginationComponent from "./pagination";
import Loading from "./loading";
import "../styles/components/table.css";
import "../styles/components/modal2.css";

export interface BusInventoryItem {
  id: string;
  bus_code: string;
  plate_number: string;
  body_number: string;
  status: string;
  is_deleted: boolean;
  created_at: string;
  
  bus_type: string;
  condition: string;
  acquisition_method: string;
  registration_status: string;
  
  chassis_number: string;
  engine_number: string;
  seat_capacity: string;
  model: string;
  year_model: string;
  acquisition_date: string;
  warranty_expiration_date: string;
  
  body_builder: {
    body_builder_id: string;
    body_builder_code: string;
    body_builder_name: string;
  };
  
  manufacturer: {
    manufacturer_id: string;
    manufacturer_code: string;
    manufacturer_name: string;
  };
  
  second_hand_details: {
    previous_owner: string;
    previous_owner_contact: string;
    source: string;
    odometer_reading: string;
    last_registration_date: string;
    description: string;
  };
  
  brand_new_details: {
    dealer_name: string;
    dealer_contact: string;
  };
}

interface BusInventorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (bus: BusInventoryItem) => void;
  selectedBusType?: 'Airconditioned' | 'Ordinary'; // Filter by bus type if specified
}

const DEFAULT_PAGE_SIZE = 10;

const BusInventorySelector: React.FC<BusInventorySelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedBusType,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [buses, setBuses] = useState<BusInventoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchBusInventory();
    }
  }, [isOpen]);

  const fetchBusInventory = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to inventory microservice
      // const response = await fetch('/api/inventory/buses?is_deleted=false&is_asset=false');
      // const data = await response.json();
      // setBuses(data);
      
      // Mock data for now
      const mockBuses: BusInventoryItem[] = [
        {
          id: "bus-inv-001",
          bus_code: "BUS-001",
          plate_number: "ABC-1234",
          body_number: "BN-001",
          status: "Active",
          is_deleted: false,
          created_at: "2020-01-15T00:00:00Z",
          bus_type: "Airconditioned",
          condition: "Good",
          acquisition_method: "Brand New",
          registration_status: "Registered",
          chassis_number: "CH-12345",
          engine_number: "EN-67890",
          seat_capacity: "45",
          model: "Yutong ZK6127H",
          year_model: "2020",
          acquisition_date: "2020-01-15",
          warranty_expiration_date: "2025-12-31",
          body_builder: {
            body_builder_id: "bb-001",
            body_builder_code: "BB-001",
            body_builder_name: "Yutong"
          },
          manufacturer: {
            manufacturer_id: "mf-001",
            manufacturer_code: "MF-001",
            manufacturer_name: "Yutong Bus Co."
          },
          second_hand_details: {
            previous_owner: "",
            previous_owner_contact: "",
            source: "",
            odometer_reading: "",
            last_registration_date: "",
            description: ""
          },
          brand_new_details: {
            dealer_name: "ABC Motors",
            dealer_contact: "+63 912 345 6789"
          }
        },
        {
          id: "bus-inv-002",
          bus_code: "BUS-002",
          plate_number: "XYZ-5678",
          body_number: "BN-002",
          status: "Active",
          is_deleted: false,
          created_at: "2019-06-10T00:00:00Z",
          bus_type: "Ordinary",
          condition: "Good",
          acquisition_method: "Second Hand",
          registration_status: "Registered",
          chassis_number: "CH-54321",
          engine_number: "EN-09876",
          seat_capacity: "50",
          model: "King Long XMQ6127",
          year_model: "2018",
          acquisition_date: "2019-06-10",
          warranty_expiration_date: "2024-06-10",
          body_builder: {
            body_builder_id: "bb-002",
            body_builder_code: "BB-002",
            body_builder_name: "King Long"
          },
          manufacturer: {
            manufacturer_id: "mf-002",
            manufacturer_code: "MF-002",
            manufacturer_name: "King Long United"
          },
          second_hand_details: {
            previous_owner: "ABC Transport Corp",
            previous_owner_contact: "+63 912 111 2222",
            source: "Direct Purchase",
            odometer_reading: "125000",
            last_registration_date: "2019-05-15",
            description: "Well-maintained unit"
          },
          brand_new_details: {
            dealer_name: "",
            dealer_contact: ""
          }
        }
      ];
      setBuses(mockBuses);
    } catch (error) {
      console.error('Error fetching bus inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter buses
  const filteredBuses = useMemo(() => {
    let filtered = buses.filter(b => !b.is_deleted);
    
    // Filter by bus type if specified
    if (selectedBusType) {
      filtered = filtered.filter(b => {
        const busType = b.bus_type.toLowerCase();
        const targetType = selectedBusType.toLowerCase();
        return busType === targetType || 
               (targetType === 'airconditioned' && busType === 'aircon') ||
               (targetType === 'ordinary' && busType === 'nonaircon');
      });
    }
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.plate_number.toLowerCase().includes(searchLower) ||
        b.model.toLowerCase().includes(searchLower) ||
        b.bus_code.toLowerCase().includes(searchLower) ||
        b.body_number.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [buses, search, selectedBusType]);

  const totalPages = Math.ceil(filteredBuses.length / pageSize || 1);
  const paginatedBuses = filteredBuses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatBusType = (busType: string): string => {
    const normalized = busType.toLowerCase();
    if (normalized === 'aircon' || normalized === 'airconditioned') {
      return 'Airconditioned';
    } else if (normalized === 'nonaircon' || normalized === 'ordinary') {
      return 'Ordinary';
    }
    return busType;
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="modal-heading">
        <h1 className="modal-title">
          Select a Bus
        </h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
    </div>

      <div className="modalContent">
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary-text-color)' }}>
          Select Bus from Inventory{selectedBusType ? ` (${selectedBusType})` : ''}
        </h2>
          <input
            type="text"
            placeholder="Search by plate number, model, bus code, or body number..."
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
                    <th>No.</th>
                    <th>Bus Code</th>
                    <th>Plate Number</th>
                    <th>Model</th>
                    <th>Bus Type</th>
                    <th>Year Model</th>
                    <th>Acquisition Date</th>
                    <th>Condition</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBuses.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: '2rem' }}>
                        No buses found in inventory.
                      </td>
                    </tr>
                  ) : (
                    paginatedBuses.map((bus, idx) => {
                      const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={bus.id}>
                          <td>{rowNumber}</td>
                          <td>{bus.bus_code}</td>
                          <td>{bus.plate_number}</td>
                          <td>{bus.model}</td>
                          <td>{formatBusType(bus.bus_type)}</td>
                          <td>{bus.year_model}</td>
                          <td>{new Date(bus.acquisition_date).toLocaleDateString()}</td>
                          <td>{bus.condition}</td>
                          <td>
                            <div className="actionButtonContainer">
                                <button
                                className="selectBtn"
                                onClick={() => {
                                    onSelect(bus);
                                    onClose();
                                }}
                                style={{ padding: '6px 12px', fontSize: '14px', color: 'white' }}
                                >
                                Select
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
    </>
  );
};

export default BusInventorySelector;
