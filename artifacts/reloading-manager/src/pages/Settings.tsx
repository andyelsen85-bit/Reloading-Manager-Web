import { useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Upload, X, Image, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function ImageUpload({
  label,
  value,
  onChange,
  onClear,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (b64: string) => void;
  onClear: () => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt={label} className="w-16 h-16 object-contain rounded border border-border bg-muted" />
          <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onClear}>
            <X className="w-4 h-4" /> Remove
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => ref.current?.click()}
        >
          <Image className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Click to upload image</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF supported</p>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateMutation = useUpdateSettings();

  const [bulletThreshold, setBulletThreshold] = useState("");
  const [powderThreshold, setPowderThreshold] = useState("");
  const [primerThreshold, setPrimerThreshold] = useState("");
  const [nextLoadNumber, setNextLoadNumber] = useState("");
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [background, setBackground] = useState<string | null | undefined>(undefined);

  const current = {
    bulletThreshold: bulletThreshold !== "" ? Number(bulletThreshold) : settings?.bulletLowStockThreshold ?? 100,
    powderThreshold: powderThreshold !== "" ? Number(powderThreshold) : settings?.powderLowStockThreshold ?? 500,
    primerThreshold: primerThreshold !== "" ? Number(primerThreshold) : settings?.primerLowStockThreshold ?? 100,
    nextLoadNumber: nextLoadNumber !== "" ? Number(nextLoadNumber) : settings?.nextLoadNumber ?? 1,
    logo: logo !== undefined ? logo : settings?.logoBase64,
    background: background !== undefined ? background : settings?.backgroundBase64,
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      data: {
        bulletLowStockThreshold: current.bulletThreshold,
        powderLowStockThreshold: current.powderThreshold,
        primerLowStockThreshold: current.primerThreshold,
        nextLoadNumber: current.nextLoadNumber,
        logoBase64: current.logo ?? null,
        backgroundBase64: current.background ?? null,
      },
    });
    qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    setBulletThreshold("");
    setPowderThreshold("");
    setPrimerThreshold("");
    setNextLoadNumber("");
    setLogo(undefined);
    setBackground(undefined);
    toast({ title: "Settings saved" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure thresholds, load numbering, and branding</p>
      </div>

      {/* Inventory health thresholds */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Inventory Health Thresholds</CardTitle>
          <p className="text-xs text-muted-foreground">Low stock warnings appear on the dashboard when quantities fall below these values</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Bullets (units)</Label>
              <Input
                type="number"
                value={bulletThreshold || String(settings?.bulletLowStockThreshold ?? 100)}
                onChange={(e) => setBulletThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Powder (grains)</Label>
              <Input
                type="number"
                value={powderThreshold || String(settings?.powderLowStockThreshold ?? 500)}
                onChange={(e) => setPowderThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Primers (units)</Label>
              <Input
                type="number"
                value={primerThreshold || String(settings?.primerLowStockThreshold ?? 100)}
                onChange={(e) => setPrimerThreshold(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Load numbering */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Hash className="w-4 h-4" /> Load Numbering
          </CardTitle>
          <p className="text-xs text-muted-foreground">New loads will be assigned sequential numbers starting from this value</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label>Next Load Number</Label>
              <Input
                type="number"
                min={1}
                value={nextLoadNumber || String(settings?.nextLoadNumber ?? 1)}
                onChange={(e) => setNextLoadNumber(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <p className="text-sm text-muted-foreground">
                Next load: <span className="font-mono font-bold text-foreground">
                  #{String(current.nextLoadNumber).padStart(5, "0")}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Branding</CardTitle>
          <p className="text-xs text-muted-foreground">Customize the app's appearance with your own logo and background</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            label="Logo"
            hint="Shown in the sidebar header. Best results with square images."
            value={current.logo}
            onChange={(b64) => setLogo(b64)}
            onClear={() => setLogo(null)}
          />
          <ImageUpload
            label="Background Image"
            hint="Applied as a full-screen background. Works best with dark, subtle textures."
            value={current.background}
            onChange={(b64) => setBackground(b64)}
            onClear={() => setBackground(null)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </motion.div>
  );
}
