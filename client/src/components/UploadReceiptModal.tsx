import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAnalyzeReceipt, useCreateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { Loader2, Check, UploadCloud, Calendar as CalendarIcon, DollarSign, Tag, Store, X, Image } from "lucide-react";
import { InsertReceipt, categories } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface UploadReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileUpload {
  file: File;
  status: "pending" | "uploading" | "analyzing" | "ready" | "saving" | "done" | "error";
  imageUrl?: string;
  formData?: Partial<InsertReceipt>;
  error?: string;
}

export function UploadReceiptModal({ open, onOpenChange }: UploadReceiptModalProps) {
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: analyze } = useAnalyzeReceipt();
  const { mutate: create, isPending: isCreating } = useCreateReceipt();
  const { toast } = useToast();
  const { userId } = useUser();

  const resetModal = () => {
    setStep("upload");
    setFiles([]);
    setCurrentReviewIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(resetModal, 300);
    }
    onOpenChange(newOpen);
  };

  const processFile = async (fileUpload: FileUpload, index: number) => {
    const updateFile = (updates: Partial<FileUpload>) => {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
    };

    try {
      updateFile({ status: "uploading" });
      
      const formData = new FormData();
      formData.append('file', fileUpload.file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.url || data.uploadURL;
      
      updateFile({ imageUrl: uploadedUrl, status: "analyzing" });

      return new Promise<void>((resolve) => {
        analyze(uploadedUrl, {
          onSuccess: (result) => {
            const amount = parseFloat(result.amount) || 0;
            const tax = result.tax ? result.tax : (amount - amount / 1.05).toFixed(2);
            updateFile({
              status: "ready",
              formData: {
                merchantName: result.merchantName,
                date: new Date(result.date),
                amount: result.amount,
                tax: tax,
                category: result.category as any,
                description: result.description,
              }
            });
            resolve();
          },
          onError: () => {
            updateFile({
              status: "ready",
              formData: {
                merchantName: fileUpload.file.name.split('.')[0] || "New Receipt",
                date: new Date(),
                amount: "0.00",
                tax: "0.00",
                category: "Other"
              }
            });
            resolve();
          }
        });
      });
    } catch (error) {
      updateFile({ status: "error", error: "Upload failed" });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({ title: "Invalid Files", description: "Please select image files.", variant: "destructive" });
      return;
    }

    const fileUploads: FileUpload[] = imageFiles.map(file => ({
      file,
      status: "pending"
    }));

    setFiles(fileUploads);
    setStep("processing");

    for (let i = 0; i < fileUploads.length; i++) {
      await processFile(fileUploads[i], i);
    }

    setStep("review");
    setCurrentReviewIndex(0);
  };

  const handleManualEntry = () => {
    setFiles([{
      file: new File([], "manual"),
      status: "ready",
      formData: {
        date: new Date(),
        category: "Other",
        amount: "0.00",
        tax: "0.00"
      }
    }]);
    setStep("review");
    setCurrentReviewIndex(0);
  };

  const updateCurrentFormData = (updates: Partial<InsertReceipt>) => {
    setFiles(prev => prev.map((f, i) => 
      i === currentReviewIndex 
        ? { ...f, formData: { ...f.formData, ...updates } }
        : f
    ));
  };

  const handleSaveCurrent = () => {
    const current = files[currentReviewIndex];
    if (!current?.formData?.merchantName || !current?.formData?.amount || !current?.formData?.date || !current?.formData?.category) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setFiles(prev => prev.map((f, i) => 
      i === currentReviewIndex ? { ...f, status: "saving" } : f
    ));

    const amount = parseFloat(current.formData.amount?.toString() || "0") || 0;
    const tax = current.formData.tax ? current.formData.tax.toString() : (amount - amount / 1.05).toFixed(2);
    
    const submissionData: any = {
      merchantName: current.formData.merchantName,
      date: current.formData.date instanceof Date ? current.formData.date : new Date(),
      amount: current.formData.amount?.toString() || "0.00",
      tax: tax,
      category: current.formData.category || "Other",
      description: current.formData.description || "",
      imageUrl: current.imageUrl || "",
      userId: userId
    };

    create(submissionData, {
      onSuccess: () => {
        setFiles(prev => prev.map((f, i) => 
          i === currentReviewIndex ? { ...f, status: "done" } : f
        ));
        
        const nextIndex = files.findIndex((f, i) => i > currentReviewIndex && f.status === "ready");
        if (nextIndex !== -1) {
          setCurrentReviewIndex(nextIndex);
          toast({ title: "Receipt Saved", description: `Moving to next receipt (${nextIndex + 1} of ${files.length})` });
        } else {
          const savedCount = files.filter(f => f.status === "done").length + 1;
          toast({ title: "All Done!", description: `${savedCount} receipt${savedCount > 1 ? 's' : ''} saved successfully.` });
          handleOpenChange(false);
        }
      },
      onError: (error: any) => {
        setFiles(prev => prev.map((f, i) => 
          i === currentReviewIndex ? { ...f, status: "ready" } : f
        ));
        toast({ 
          title: "Save Failed", 
          description: error.message || "Could not save receipt. Please try again.", 
          variant: "destructive" 
        });
      }
    });
  };

  const skipCurrent = () => {
    const nextIndex = files.findIndex((f, i) => i > currentReviewIndex && f.status === "ready");
    if (nextIndex !== -1) {
      setCurrentReviewIndex(nextIndex);
    } else {
      const savedCount = files.filter(f => f.status === "done").length;
      if (savedCount > 0) {
        toast({ title: "Done", description: `${savedCount} receipt${savedCount > 1 ? 's' : ''} saved.` });
      }
      handleOpenChange(false);
    }
  };

  const currentFile = files[currentReviewIndex];
  const readyCount = files.filter(f => f.status === "ready").length;
  const doneCount = files.filter(f => f.status === "done").length;
  const processingCount = files.filter(f => f.status === "uploading" || f.status === "analyzing").length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-none shadow-2xl rounded-3xl">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-primary/5 to-transparent"
            >
              <div className="w-20 h-20 bg-white dark:bg-muted rounded-full shadow-xl shadow-primary/10 flex items-center justify-center mb-6">
                <UploadCloud className="w-10 h-10 text-primary" />
              </div>
              <DialogHeader className="mb-8 text-center">
                <DialogTitle className="text-2xl font-display font-bold">Upload Receipts</DialogTitle>
                <DialogDescription>Select one or more receipt photos to upload.</DialogDescription>
              </DialogHeader>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs h-12 text-lg font-medium shadow-lg shadow-primary/25 rounded-xl bg-primary hover:bg-primary/90 text-white mb-4"
                data-testid="button-select-file"
              >
                Select Files
              </Button>

              <Button 
                variant="ghost" 
                onClick={handleManualEntry}
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="button-manual-entry"
              >
                Enter Manually
              </Button>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-8 flex flex-col items-center justify-center min-h-[400px]"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">Processing Receipts...</h3>
              <p className="text-muted-foreground text-center max-w-[250px] mb-4">
                Uploading and analyzing {files.length} receipt{files.length > 1 ? 's' : ''}.
              </p>
              
              <div className="w-full max-w-xs space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      f.status === "done" ? "bg-green-100 text-green-600" :
                      f.status === "error" ? "bg-red-100 text-red-600" :
                      f.status === "uploading" || f.status === "analyzing" ? "bg-primary/10 text-primary" :
                      f.status === "ready" ? "bg-green-100 text-green-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {f.status === "done" || f.status === "ready" ? <Check className="w-3 h-3" /> :
                       f.status === "error" ? <X className="w-3 h-3" /> :
                       f.status === "uploading" || f.status === "analyzing" ? <Loader2 className="w-3 h-3 animate-spin" /> :
                       <Image className="w-3 h-3" />}
                    </div>
                    <span className="truncate flex-1">{f.file.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{f.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === "review" && currentFile && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col h-full max-h-[85vh]"
            >
              <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">
                    Review Details {files.length > 1 && `(${currentReviewIndex + 1}/${files.length})`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {files.length > 1 
                      ? `${doneCount} saved, ${readyCount} remaining`
                      : "Confirm the extracted information."}
                  </p>
                </div>
                {currentFile.imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white shadow-sm">
                    <img src={currentFile.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Store className="w-3 h-3" /> Merchant
                  </label>
                  <input
                    value={currentFile.formData?.merchantName || ""}
                    onChange={(e) => updateCurrentFormData({ merchantName: e.target.value })}
                    className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-lg"
                    placeholder="e.g. Starbucks"
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
                      value={currentFile.formData?.amount || ""}
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value) || 0;
                        updateCurrentFormData({ 
                          amount: e.target.value,
                          tax: (newAmount - newAmount / 1.05).toFixed(2)
                        });
                      }}
                      className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> Tax Included
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentFile.formData?.tax || ""}
                      onChange={(e) => updateCurrentFormData({ tax: e.target.value })}
                      className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> Date
                    </label>
                    <input
                      type="date"
                      value={currentFile.formData?.date instanceof Date ? currentFile.formData.date.toISOString().split('T')[0] : (typeof currentFile.formData?.date === 'string' ? currentFile.formData.date : '')}
                      onChange={(e) => updateCurrentFormData({ date: new Date(e.target.value) })}
                      className="w-full p-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                        onClick={() => updateCurrentFormData({ category: cat })}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all text-left truncate ${
                          currentFile.formData?.category === cat 
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Or Custom Category</p>
                    <input
                      value={!categories.includes(currentFile.formData?.category as any) ? currentFile.formData?.category || "" : ""}
                      onChange={(e) => updateCurrentFormData({ category: e.target.value })}
                      className="w-full p-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                      placeholder="Type custom category..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/20 flex justify-between gap-3">
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
                  {files.length > 1 && (
                    <Button variant="outline" onClick={skipCurrent}>Skip</Button>
                  )}
                </div>
                <Button 
                  onClick={handleSaveCurrent} 
                  disabled={isCreating || currentFile.status === "saving"}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-xl shadow-lg shadow-primary/20"
                >
                  {isCreating || currentFile.status === "saving" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  {files.length > 1 ? "Save & Next" : "Save Receipt"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
