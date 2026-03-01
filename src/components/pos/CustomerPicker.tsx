import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Search, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  loyalty_points: number;
}

interface CustomerPickerProps {
  businessId: string | null;
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export default function CustomerPicker({ businessId, selectedCustomer, onSelect }: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !businessId) return;
    loadCustomers();
  }, [open, businessId]);

  const loadCustomers = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, loyalty_points")
      .eq("business_id", businessId)
      .order("name")
      .limit(50);
    setCustomers(data ?? []);
    setLoading(false);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1.5">
        <User className="h-3.5 w-3.5 text-primary" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-primary truncate block">{selectedCustomer.name}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Star className="h-2.5 w-2.5" /> {selectedCustomer.loyalty_points} pts
          </span>
        </div>
        <button onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-start">
          <User className="h-3 w-3" /> Add Customer
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" side="top" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No customers found</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  {c.phone && <p className="text-[10px] text-muted-foreground">{c.phone}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{c.loyalty_points} pts</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
