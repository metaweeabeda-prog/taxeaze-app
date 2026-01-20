import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Calendar as CalendarIcon, DollarSign, Tag, Store, FileText } from "lucide-react";
import { categories, type Receipt } from "@shared/schema";

interface EditReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
}

export function EditReceiptModal({ open, onOpenChange, receipt }: EditReceiptModalProps) {
  const [formData, setFormData] = useState({
    merchantName: "",
    amount: "",
    tax: "",
    date: "",
    category: "",
    description: ""
  });
  
  const { mutate: update, isPending } = useUpdateReceipt();
  const { toast } = useToast();

  useEffect(() => {
    if (receipt) {
      setFormData({
        merchantName: receipt.merchantName || "",
        amount: receipt.amount?.toString() || "",
        tax: receipt.tax?.toString() || (Number(receipt.amount) - Number(receipt.amount) / 1.05).toFixed(2),
        date: receipt.date ? new Date(receipt.date).toISOString().split('T')[0] : "",
        category: receipt.category || "",
        description: receipt.description || ""
      });
    }
  }, [receipt]);

  const handleSave = () => {
    if (!receipt) return;
    
    if (!formData.merchantName || !formData.amount || !formData.date || !formData.category) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    update({
      id: receipt.id,
      data: {
        merchantName: formData.merchantName,
        amount: formData.amount,
        tax: formData.tax,
        date: new Date(formData.date),
        category: formData.category,
        description: formData.description
      }
    }, {
      onSuccess: () => {
        toast({ title: "Receipt Updated", description: "Your changes have been saved." });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Update Failed", description: "Could not update receipt.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-none shadow-2xl rounded-3xl">
        <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 flex items-start justify-between">
          <div>
            <DialogTitle className="font-display font-bold text-xl text-foreground">Edit Receipt</DialogTitle>
            <p className="text-sm text-muted-foreground">Update the receipt details.</p>
          </div>
          {receipt?.imageUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white shadow-sm">
              <img src={receipt.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Store className="w-3 h-3" /> Merchant
            </label>
            <input
              value={formData.merchantName}
              onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
              className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-lg"
              placeholder="e.g. Starbucks"
              data-testid="input-edit-merchant"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => {
                  const newAmount = parseFloat(e.target.value) || 0;
                  setFormData({ 
                    ...formData, 
                    amount: e.target.value,
                    tax: (newAmount - newAmount / 1.05).toFixed(2)
                  });
                }}
                className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-lg"
                placeholder="0.00"
                data-testid="input-edit-amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Tax
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-lg"
                placeholder="0.00"
                data-testid="input-edit-tax"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" /> Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                data-testid="input-edit-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Tag className="w-3 h-3" /> Category
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all text-left truncate ${
                    formData.category === cat 
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Or Custom Category</p>
              <input
                value={!categories.includes(formData.category as any) ? formData.category : ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                placeholder="Type custom category..."
                data-testid="input-edit-custom-category"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="w-3 h-3" /> Notes
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              placeholder="Add notes about this receipt (e.g. 'Client dinner with John')"
              rows={3}
              data-testid="input-edit-notes"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-xl shadow-lg shadow-primary/20"
            data-testid="button-save-edit"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
