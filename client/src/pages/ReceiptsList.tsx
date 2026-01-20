import { useState } from "react";
import { format } from "date-fns";
import { useReceipts, useDeleteReceipt } from "@/hooks/use-receipts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, Filter, Receipt as ReceiptIcon, Download, Calendar, Edit2, FileText } from "lucide-react";
import { categories, type Receipt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UploadReceiptModal } from "@/components/UploadReceiptModal";
import { EditReceiptModal } from "@/components/EditReceiptModal";
import { useUser } from "@/context/UserContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ReceiptsList() {
  const { userId } = useUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  
  const { data: receipts, isLoading } = useReceipts({ 
    search: search || undefined, 
    category: category !== "all" ? category : undefined,
    userId,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });
  
  const { mutate: deleteReceipt } = useDeleteReceipt();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteReceipt(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Receipt has been removed." }),
      onError: () => toast({ title: "Error", description: "Failed to delete receipt.", variant: "destructive" })
    });
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">My Receipts</h1>
          <p className="text-muted-foreground dark:text-primary dark:font-semibold mt-1">Manage and organize your uploaded documents. Click a receipt to edit.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="h-12 px-4 rounded-xl border-border hover:bg-muted/50 transition-all flex items-center gap-2"
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.append('search', search);
              if (category !== "all") params.append('category', category);
              if (startDate) params.append('startDate', startDate);
              if (endDate) params.append('endDate', endDate);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export?${params.toString()}`;
            }}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Excel</span>
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-4 rounded-xl border-border hover:bg-muted/50 transition-all flex items-center gap-2"
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.append('search', search);
              if (category !== "all") params.append('category', category);
              if (startDate) params.append('startDate', startDate);
              if (endDate) params.append('endDate', endDate);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export-pdf?${params.toString()}`;
            }}
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>PDF</span>
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-12 rounded-xl shadow-lg shadow-primary/25" data-testid="button-upload-new">
            Upload New
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-8 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search merchants..." 
              className="pl-10 h-11 bg-muted/20 border-border rounded-xl focus:bg-card transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border" data-testid="select-category">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Date Range:</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 bg-muted/20 border-border rounded-xl"
              data-testid="input-start-date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 bg-muted/20 border-border rounded-xl"
              data-testid="input-end-date"
            />
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilter} data-testid="button-clear-dates">
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {receipts?.map((receipt) => (
              <motion.div
                key={receipt.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-card rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => setEditingReceipt(receipt)}
                data-testid={`card-receipt-${receipt.id}`}
              >
                {/* Edit indicator */}
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-card/90 backdrop-blur-sm rounded-full p-2 shadow-md">
                    <Edit2 className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {/* Image Preview Area */}
                <div 
                  className="h-40 w-full bg-slate-100 overflow-hidden relative"
                  onClick={(e) => {
                    if (receipt.imageUrl) {
                      e.stopPropagation();
                      setSelectedImage(receipt.imageUrl);
                    }
                  }}
                >
                  {receipt.imageUrl ? (
                    <img 
                      src={receipt.imageUrl} 
                      alt={receipt.merchantName} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-50">
                      <ReceiptIcon className="w-8 h-8 opacity-20 mb-2" />
                      <span className="text-[10px] font-medium uppercase tracking-widest opacity-40">No Receipt Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground truncate max-w-[150px]">{receipt.merchantName}</h3>
                      <p className="text-xs text-muted-foreground">{format(new Date(receipt.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-bold text-lg text-primary block">
                        ${Number(receipt.amount).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Tax: ${Number(receipt.tax || (Number(receipt.amount) - Number(receipt.amount) / 1.05)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {receipt.description && (
                    <p className="text-xs text-muted-foreground truncate mb-2 italic">
                      "{receipt.description}"
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {receipt.category}
                    </span>
                    <button 
                      type="button"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDelete(receipt.id);
                      }}
                      data-testid={`button-delete-receipt-${receipt.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {receipts?.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                <ReceiptIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No receipts found</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Try adjusting your search filters or upload a new receipt to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none">
          {selectedImage && (
            <div className="relative h-[80vh] w-full flex items-center justify-center">
              <img src={selectedImage} alt="Receipt Full" className="max-h-full max-w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UploadReceiptModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      <EditReceiptModal open={!!editingReceipt} onOpenChange={(open) => !open && setEditingReceipt(null)} receipt={editingReceipt} />
    </div>
  );
}
