import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Plus, Trash2, Upload, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/lib/storage";
import type { AcaiSize } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Açaí PDV" },
      { name: "description", content: "Cadastre tamanhos, logo e dados do estabelecimento." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const [settings, setSettings] = useSettings();
  const [storeName, setStoreName] = useState(settings.storeName);
  const [footerText, setFooterText] = useState(settings.footerText || "");
  const [sizes, setSizes] = useState<AcaiSize[]>(settings.sizes);
  const [logo, setLogo] = useState<string | undefined>(settings.logoDataUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStoreName(settings.storeName);
    setFooterText(settings.footerText || "");
    setSizes(settings.sizes);
    setLogo(settings.logoDataUrl);
  }, [settings]);

  function onLogo(file: File | null) {
    if (!file) return;
    if (file.size > 500_000) {
      toast.error("Logo muito grande (máx 500KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addSize() {
    setSizes((p) => [...p, { id: crypto.randomUUID(), name: "Novo tamanho", price: 0 }]);
  }
  function updateSize(id: string, patch: Partial<AcaiSize>) {
    setSizes((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeSize(id: string) {
    setSizes((p) => p.filter((s) => s.id !== id));
  }

  function save() {
    setSettings((prev) => ({
      ...prev,
      storeName: storeName.trim() || "Açaí",
      footerText: footerText.trim(),
      sizes,
      logoDataUrl: logo,
    }));
    toast.success("Configurações salvas");
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold">Configurações</h1>
            <p className="text-muted-foreground mt-1">Personalize sua loja e tamanhos</p>
          </div>
          <Button onClick={save} className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <Save className="h-4 w-4 mr-1" /> Salvar tudo
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-[var(--shadow-md)]">
            <CardHeader><CardTitle className="font-display">Identidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do estabelecimento</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div>
                <Label>Logo (PNG/JPG, máx 500KB)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-20 w-20 rounded-xl bg-muted border flex items-center justify-center overflow-hidden">
                    {logo ? <img src={logo} alt="logo" className="max-h-full max-w-full" /> : <span className="text-xs text-muted-foreground">sem logo</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] ?? null)} />
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Enviar
                  </Button>
                  {logo && <Button variant="ghost" onClick={() => setLogo(undefined)}>Remover</Button>}
                </div>
              </div>
              <div>
                <Label>Texto de rodapé do recibo</Label>
                <Textarea rows={3} value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Obrigado pela preferência!" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[var(--shadow-md)]">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display">Tamanhos & preços</CardTitle>
              <Button size="sm" variant="outline" onClick={addSize}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {sizes.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-3 rounded-xl border bg-muted/30">
                  <Input className="flex-1" value={s.name} onChange={(e) => updateSize(s.id, { name: e.target.value })} />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input type="number" step="0.01" className="w-24" value={s.price} onChange={(e) => updateSize(s.id, { price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <Switch checked={!!s.custom} onCheckedChange={(v) => updateSize(s.id, { custom: v })} />
                    <span className="text-xs">Custom</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeSize(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
