import React, { useState, useMemo, useEffect } from "react";
import PaginationComponent from "./pagination";
import Loading from "./loading";
import "../styles/components/table.css";
import "../styles/components/modal2.css";

export interface ItemBatchInventory {
  batch_asset_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  description: string;
  
  category: {
    category_id: string;
    category_code: string;
    category_name: string;
  };
  
  unit: {
    unit_id: string;
    unit_code: string;
    unit_name: string;
    abbreviation: string;
  };
  
  quantity: string;
  acquisition_date: string;
  acquisition_cost: string;
  
  batch_number: string;
  stock_id: string;
  order_code: string;
}

interface ItemBatchSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (batch: ItemBatchInventory) => void;
}

const DEFAULT_PAGE_SIZE = 10;

const ItemBatchSelector: React.FC<ItemBatchSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [batches, setBatches] = useState<ItemBatchInventory[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchItemBatches();
    }
  }, [isOpen]);

  const fetchItemBatches = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to inventory microservice
      // const response = await fetch('/api/inventory/item-batches?is_asset=true&is_deleted=false');
      // const data = await response.json();
      // setBatches(data);
      
      // Mock data for now
      const mockBatches: ItemBatchInventory[] = [
        {
          batch_asset_id: "batch-001",
          item_id: "item-001",
          item_code: "ITM-001",
          item_name: "Desktop Computer",
          description: "Dell OptiPlex 7090 - Intel i7, 16GB RAM, 512GB SSD",
          category: {
            category_id: "cat-001",
            category_code: "CAT-001",
            category_name: "Computer Equipment"
          },
          unit: {
            unit_id: "unit-001",
            unit_code: "UNIT-001",
            unit_name: "Piece",
            abbreviation: "pcs"
          },
          quantity: "10",
          acquisition_date: "2024-01-15",
          acquisition_cost: "25000",
          batch_number: "BATCH-2024-001",
          stock_id: "STK-001",
          order_code: "PO-2024-001"
        },
        {
          batch_asset_id: "batch-002",
          item_id: "item-002",
          item_code: "ITM-002",
          item_name: "Office Chair",
          description: "Ergonomic office chair with lumbar support",
          category: {
            category_id: "cat-002",
            category_code: "CAT-002",
            category_name: "Furniture"
          },
          unit: {
            unit_id: "unit-001",
            unit_code: "UNIT-001",
            unit_name: "Piece",
            abbreviation: "pcs"
          },
          quantity: "25",
          acquisition_date: "2024-02-20",
          acquisition_cost: "3500",
          batch_number: "BATCH-2024-002",
          stock_id: "STK-002",
          order_code: "PO-2024-002"
        },
        {
          batch_asset_id: "batch-003",
          item_id: "item-003",
          item_code: "ITM-003",
          item_name: "Air Conditioning Unit",
          description: "Split-type aircon 2.0HP inverter",
          category: {
            category_id: "cat-003",
            category_code: "CAT-003",
            category_name: "Equipment"
          },
          unit: {
            unit_id: "unit-002",
            unit_code: "UNIT-002",
            unit_name: "Unit",
            abbreviation: "unit"
          },
          quantity: "5",
          acquisition_date: "2024-03-10",
          acquisition_cost: "28000",
          batch_number: "BATCH-2024-003",
          stock_id: "STK-003",
          order_code: "PO-2024-003"
        }
      ];
      setBatches(mockBatches);
    } catch (error) {
      console.error('Error fetching item batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter batches
  const filteredBatches = useMemo(() => {
    let filtered = [...batches];
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.item_name.toLowerCase().includes(searchLower) ||
        b.item_code.toLowerCase().includes(searchLower) ||
        b.batch_number.toLowerCase().includes(searchLower) ||
        b.category.category_name.toLowerCase().includes(searchLower) ||
        b.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [batches, search]);

  const totalPages = Math.ceil(filteredBatches.length / pageSize || 1);
  const paginatedBatches = filteredBatches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="modalContent">
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary-text-color)' }}>
          Select Item Batch from Inventory
        </h2>
          <input
            type="text"
            placeholder="Search by item name, code, batch number, or category..."
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
                    <th>Batch Number</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Acquisition Date</th>
                    <th>Unit Cost</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBatches.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: '2rem' }}>
                        No item batches found in inventory.
                      </td>
                    </tr>
                  ) : (
                    paginatedBatches.map((batch, idx) => {
                      const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                      const totalCost = parseFloat(batch.quantity) * parseFloat(batch.acquisition_cost);
                      return (
                        <tr key={batch.batch_asset_id}>
                          <td>{rowNumber}</td>
                          <td>{batch.batch_number}</td>
                          <td>{batch.item_code}</td>
                          <td>
                            <div>{batch.item_name}</div>
                            <small style={{ color: '#666', fontSize: '12px' }}>
                              {batch.description}
                            </small>
                          </td>
                          <td>{batch.category.category_name}</td>
                          <td style={{ textAlign: 'center' }}>{batch.quantity}</td>
                          <td>{batch.unit.abbreviation}</td>
                          <td>{new Date(batch.acquisition_date).toLocaleDateString()}</td>
                          <td>
                            <div>₱{parseFloat(batch.acquisition_cost).toLocaleString()}</div>
                            <small style={{ color: '#666', fontSize: '11px' }}>
                              Total: ₱{totalCost.toLocaleString()}
                            </small>
                          </td>
                          <td>
                            <button
                              className="submitButton"
                              onClick={() => {
                                onSelect(batch);
                                onClose();
                              }}
                              style={{ padding: '6px 12px', fontSize: '14px' }}
                            >
                              Select
                            </button>
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

export default ItemBatchSelector;
