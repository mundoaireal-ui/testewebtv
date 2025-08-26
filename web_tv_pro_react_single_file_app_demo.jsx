import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { Play, Pause, Radio, Calendar, Film, LogIn, User, Upload, Plus, Clock, Settings, Tv, Search, Heart, Star, CreditCard, LineChart, Bell, Moon, Sun, MonitorPlay, BadgeDollarSign, FolderVideo, Layers, Shield, Users, Power, ListChecks } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// --- Utility helpers
const cx = (...classes) => classes.filter(Boolean).join(" ");
const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const now = () => new Date();
const COLORS = {
  primary: "#1F3C88", // azul royal
  accent: "#E53935", // vermelho vibrante
  gold: "#FFC107", // amarelo dourado
  graphite: "#2E2E2E", // cinza grafite
};

// --- Mock data & simple persistence
const LS_KEYS = {
  user: "webtv_user",
  videos: "webtv_videos",
  commercials: "webtv_commercials",
  schedule: "webtv_schedule",
  favorites: "webtv_favorites",
  sponsors: "webtv_sponsors",
  theme: "webtv_theme",
};

const defaultVideos = [
  { id: "v1", title: "Show – Banda Ao Vivo", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", type: "music", sponsored: false, duration: 210 },
  { id: "v2", title: "Matéria – Cultura & Cidade", url: "https://test-streams.mux.dev/pts-lv/playlist.m3u8", type: "news", sponsored: false, duration: 240 },
  { id: "v3", title: "Comercial – Padaria Casa Nova", url: "https://test-streams.mux.dev/dai-discontinuity-daterange/manifest.m3u8", type: "ad", sponsored: true, duration: 30 },
];

const defaultCommercials = [
  { id: "c1", title: "Anúncio – Super Promo", url: "https://test-streams.mux.dev/dai-discontinuity-daterange/manifest.m3u8", sponsor: "Casa Nova", duration: 30 },
];

const defaultSchedule = [
  { id: "s1", title: "Manhã Musical", start: "08:00", end: "10:00", playlist: ["v1", "v3", "v1"], type: "program" },
  { id: "s2", title: "Informativo Local", start: "12:00", end: "13:00", playlist: ["v2", "v3"], type: "program" },
  { id: "s3", title: "Tarde Hits", start: "16:00", end: "18:00", playlist: ["v1", "v1", "v3"], type: "program" },
];

const defaultSponsors = [
  { id: "sp1", name: "Casa Nova", message: "Pães quentinhos o dia todo!", link: "#" },
  { id: "sp2", name: "Rooster King", message: "Sábado é dia de música!", link: "#" },
];

function useLocalState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

// --- Video Player with Live + Auto VJ
function WebTVPlayer({ hlsUrl, dashUrl, rtmpInfo, autoPlaylist }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [source, setSource] = useState(null); // { kind: 'live'|'auto', url }
  const [currentIndex, setCurrentIndex] = useState(0);

  // choose best source: try live first if provided + toggled on; else Auto VJ
  useEffect(() => {
    if (liveOn && hlsUrl) {
      setSource({ kind: "live", url: hlsUrl });
    } else if (autoPlaylist?.length) {
      const item = autoPlaylist[currentIndex % autoPlaylist.length];
      setSource({ kind: "auto", url: item.url, title: item.title });
    }
  }, [liveOn, hlsUrl, currentIndex, autoPlaylist]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source?.url) return;

    // Basic HLS handling
    const isHls = source.url.endsWith(".m3u8") || source.url.includes("m3u8");
    let hls;
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ autoStartLoad: true });
      hls.loadSource(source.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } else {
      // MP4 or native HLS (Safari)
      video.src = source.url;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [source?.url]);

  // Auto-advance for Auto VJ
  const onEnded = () => {
    if (source?.kind === "auto" && autoPlaylist?.length) {
      setCurrentIndex((i) => (i + 1) % autoPlaylist.length);
    }
  };

  return (
    <Card className="bg-white dark:bg-zinc-900 border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: COLORS.primary }}>
            <Tv className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl">Web TV • {source?.kind === "live" ? "AO VIVO" : "Auto VJ"}</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Radio className={cx("h-4 w-4", liveOn ? "text-red-500" : "text-zinc-400")} />
            <Label className="text-sm">Ao vivo</Label>
            <Switch checked={liveOn} onCheckedChange={setLiveOn} />
          </div>
          <Button onClick={() => { const v = videoRef.current; if (!v) return; if (isPlaying) { v.pause(); setIsPlaying(false); } else { v.play().then(()=>setIsPlaying(true)).catch(()=>{}); } }}
            className="rounded-2xl px-4"
            style={{ background: COLORS.accent }}>
            {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
            {isPlaying ? "Pausar" : "Reproduzir"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} onEnded={onEnded} controls className="w-full h-full" playsInline />
          {source?.kind === "live" && (
            <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full bg-red-600 text-white">AO VIVO</span>
          )}
          {source?.kind === "auto" && (
            <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full bg-zinc-800/80 text-white">Auto VJ • {source?.title}</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <Card className="md:col-span-3 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4"/>Próximos Programas</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingSchedule />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><BadgeDollarSign className="h-4 w-4"/>Patrocinadores</CardTitle>
            </CardHeader>
            <CardContent>
              <SponsorsMarquee />
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingSchedule() {
  const [schedule] = useLocalState(LS_KEYS.schedule, defaultSchedule);
  const entries = useMemo(() => {
    const today = new Date();
    return schedule
      .map((s) => ({
        ...s,
        startDate: toTodayTime(s.start),
      }))
      .filter((s) => s.startDate > today)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, 5);
  }, [schedule]);

  return (
    <div className="space-y-3">
      {entries.length === 0 && <p className="text-sm text-zinc-500">Sem itens programados para hoje.</p>}
      {entries.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-xl border p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><Clock className="h-4 w-4"/></div>
            <div>
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-zinc-500">{e.start} • {e.end}</div>
            </div>
          </div>
          <Badge style={{ background: COLORS.gold, color: "#222" }}>Programado</Badge>
        </div>
      ))}
    </div>
  );
}

function SponsorsMarquee() {
  const [sponsors] = useLocalState(LS_KEYS.sponsors, defaultSponsors);
  return (
    <div className="space-y-2">
      {sponsors.map((s) => (
        <a key={s.id} href={s.link} className="flex items-center justify-between rounded-xl border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-zinc-500">{s.message}</div>
          </div>
          <Star className="h-4 w-4"/>
        </a>
      ))}
    </div>
  );
}

// --- Schedule Grid (Admin + Public)
function ScheduleGrid() {
  const [schedule, setSchedule] = useLocalState(LS_KEYS.schedule, defaultSchedule);
  const [videos] = useLocalState(LS_KEYS.videos, defaultVideos);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

  const addProgram = () => {
    const id = crypto.randomUUID();
    setSchedule((s) => [...s, { id, title: "Novo Programa", start: "19:00", end: "20:00", playlist: [videos[0]?.id].filter(Boolean), type: "program" }]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Calendar className="h-4 w-4"/> Grade de Programação</h3>
        <Button onClick={addProgram} className="rounded-2xl"><Plus className="h-4 w-4 mr-2"/>Adicionar</Button>
      </div>
      <div className="overflow-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
            <tr>
              <th className="p-3 text-left">Horário</th>
              <th className="p-3 text-left">Programa</th>
              <th className="p-3 text-left">Playlist</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => {
              const match = schedule.find((s) => s.start === h);
              return (
                <tr key={h} className="border-t">
                  <td className="p-3 w-32 font-medium">{h}</td>
                  <td className="p-3">{match ? match.title : <span className="text-zinc-400">—</span>}</td>
                  <td className="p-3">
                    {match ? (
                      <div className="flex flex-wrap gap-2">
                        {match.playlist.map((vid) => {
                          const v = videos.find((x) => x.id === vid);
                          return <Badge key={vid} variant="secondary" className="rounded-xl">{v?.title || vid}</Badge>;
                        })}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {match && (
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-2xl"><Settings className="h-4 w-4 mr-2"/>Editar</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Editar Programa</DialogTitle>
                            </DialogHeader>
                            <EditProgramForm program={match} onSave={(updated)=>{
                              setSchedule((all) => all.map((p) => p.id === updated.id ? updated : p));
                            }} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" className="rounded-2xl" onClick={() => setSchedule((all) => all.filter((p) => p.id !== match.id))}><TrashIcon/>Excluir</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrashIcon(){ return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M8 6v12m8-12v12M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14M9 6l1-2h4l1 2"/></svg>; }

function EditProgramForm({ program, onSave }){
  const [videos] = useLocalState(LS_KEYS.videos, defaultVideos);
  const [title, setTitle] = useState(program.title);
  const [start, setStart] = useState(program.start);
  const [end, setEnd] = useState(program.end);
  const [playlist, setPlaylist] = useState(program.playlist);

  const toggleVid = (id) => {
    setPlaylist((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Início</Label>
            <Input type="time" value={start} onChange={(e)=>setStart(e.target.value)} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <Label>Playlist</Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {videos.map((v) => (
            <label key={v.id} className={cx("flex items-center gap-3 border rounded-xl p-2", playlist.includes(v.id) ? "bg-zinc-50 dark:bg-zinc-900" : "") }>
              <Checkbox checked={playlist.includes(v.id)} onCheckedChange={()=>toggleVid(v.id)} />
              <div>
                <div className="font-medium">{v.title}</div>
                <div className="text-xs text-zinc-500">{v.type} • {v.duration}s</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={()=> onSave({ ...program, title, start, end, playlist })} className="rounded-2xl"><ListChecks className="h-4 w-4 mr-2"/>Salvar</Button>
      </div>
    </div>
  );
}

// --- Library Manager
function LibraryManager(){
  const [videos, setVideos] = useLocalState(LS_KEYS.videos, defaultVideos);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = videos.filter(v => (filter === "all" || v.type === filter) && v.title.toLowerCase().includes(query.toLowerCase()));

  const addVideo = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    const entry = {
      id,
      title: data.get("title"),
      url: data.get("url"),
      type: data.get("type"),
      sponsored: data.get("sponsored") === "on",
      duration: Number(data.get("duration") || 0),
    };
    setVideos(v => [entry, ...v]);
    e.currentTarget.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FolderVideo className="h-5 w-5"/> Biblioteca</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar…" value={query} onChange={(e)=>setQuery(e.target.value)} className="w-48" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="music">Músicas</SelectItem>
                <SelectItem value="news">Matérias</SelectItem>
                <SelectItem value="ad">Propagandas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(v => (
              <Card key={v.id} className="border rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Film className="h-4 w-4"/> {v.title}
                    {v.sponsored && <Badge style={{ background: COLORS.gold, color: "#222" }} className="ml-auto">Patrocinado</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-zinc-500">{v.type} • {v.duration || "?"}s</div>
                  <div className="mt-2 text-xs break-all text-zinc-600 dark:text-zinc-400">{v.url}</div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-sm text-zinc-500">Nenhum item encontrado.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5"/> Enviar Vídeo / Ad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addVideo} className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>URL (HLS .m3u8 ou MP4)</Label>
              <Input name="url" placeholder="https://..." required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select name="type" onValueChange={(v)=>{ const hidden = document.getElementById("type-hidden"); if(hidden) hidden.value = v; }}>
                  <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">Música</SelectItem>
                    <SelectItem value="news">Matéria</SelectItem>
                    <SelectItem value="ad">Propaganda</SelectItem>
                  </SelectContent>
                </Select>
                <input id="type-hidden" name="type" type="hidden" defaultValue="music" />
              </div>
              <div>
                <Label>Duração (s)</Label>
                <Input name="duration" type="number" min={0} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox name="sponsored" id="sponsored" />
              <Label htmlFor="sponsored">Destacar como patrocinado</Label>
            </div>
            <Button type="submit" className="w-full rounded-2xl"><Plus className="h-4 w-4 mr-2"/>Adicionar à Biblioteca</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Ads (Sponsors)
function SponsorsManager(){
  const [sponsors, setSponsors] = useLocalState(LS_KEYS.sponsors, defaultSponsors);

  const add = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    setSponsors((s) => [...s, { id, name: data.get("name"), message: data.get("message"), link: data.get("link") }]);
    e.currentTarget.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5"/> Patrocinadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-xl p-3">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-zinc-500">{s.message}</div>
                  <div className="text-xs text-zinc-400 break-all">{s.link}</div>
                </div>
                <Button variant="destructive" className="rounded-2xl" onClick={()=>setSponsors((all)=>all.filter(x=>x.id!==s.id))}><TrashIcon/>Remover</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5"/> Novo Patrocinador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Input name="message" required />
            </div>
            <div>
              <Label>Link</Label>
              <Input name="link" placeholder="#" />
            </div>
            <Button type="submit" className="w-full rounded-2xl">Adicionar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Auth & User Panel (mock)
function useAuth(){
  const [user, setUser] = useLocalState(LS_KEYS.user, null);
  const login = (email) => setUser({ id: "u1", name: email.split("@")[0], email, plan: "Mensal" });
  const logout = () => setUser(null);
  return { user, login, logout };
}

function AccountPanel(){
  const { user, login, logout } = useAuth();
  const [favorites, setFavorites] = useLocalState(LS_KEYS.favorites, []);

  if (!user) return <GuestLogin onLogin={login} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/> Perfil do Assinante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-zinc-500">Nome</span><div className="font-medium">{user.name}</div></div>
            <div><span className="text-zinc-500">Email</span><div className="font-medium">{user.email}</div></div>
            <div><span className="text-zinc-500">Plano</span><div className="font-medium">{user.plan}</div></div>
            <div><span className="text-zinc-500">Favoritos</span><div className="font-medium">{favorites.length}</div></div>
          </div>
          <Separator className="my-4"/>
          <div className="flex items-center justify-between">
            <Button variant="outline" className="rounded-2xl" onClick={logout}><Power className="h-4 w-4 mr-2"/>Sair</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl" style={{ background: COLORS.primary }}><CreditCard className="h-4 w-4 mr-2"/>Gerenciar Assinatura</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pagamento (demo)</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-zinc-500">Integre aqui seu gateway (ex.: Stripe, Mercado Pago). Este é apenas um placeholder.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="rounded-2xl">Mensal – R$ 29,90</Button>
                  <Button variant="outline" className="rounded-2xl">Anual – R$ 299,00</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Notificações Push</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Permita alertas para novas transmissões.</p>
          <Button className="rounded-2xl mt-2" onClick={()=>{
            if (!("Notification" in window)) return alert("Seu navegador não suporta notificações.");
            Notification.requestPermission().then((res)=>{
              if(res === "granted") new Notification("Notificações ativadas!", { body: "Você receberá alertas de novas lives." });
            });
          }}>Ativar</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GuestLogin({ onLogin }){
  const [email, setEmail] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LogIn className="h-5 w-5"/> Entrar / Cadastrar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <Button className="rounded-2xl" onClick={()=> onLogin(email || "assinante@demo.tv")}>Continuar</Button>
          <p className="text-xs text-zinc-500">Ao continuar, você aceita os Termos e a Política.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Admin Dashboard
function AdminPanel(){
  return (
    <Tabs defaultValue="transmissoes" className="w-full">
      <TabsList className="flex flex-wrap gap-2">
        <TabsTrigger value="transmissoes" className="rounded-2xl"><MonitorPlay className="h-4 w-4 mr-2"/>Transmissões</TabsTrigger>
        <TabsTrigger value="grade" className="rounded-2xl"><Calendar className="h-4 w-4 mr-2"/>Grade</TabsTrigger>
        <TabsTrigger value="biblioteca" className="rounded-2xl"><Layers className="h-4 w-4 mr-2"/>Biblioteca</TabsTrigger>
        <TabsTrigger value="patrocinios" className="rounded-2xl"><Star className="h-4 w-4 mr-2"/>Patrocínios</TabsTrigger>
        <TabsTrigger value="relatorios" className="rounded-2xl"><LineChart className="h-4 w-4 mr-2"/>Relatórios</TabsTrigger>
        <TabsTrigger value="seguranca" className="rounded-2xl"><Shield className="h-4 w-4 mr-2"/>Segurança</TabsTrigger>
        <TabsTrigger value="usuarios" className="rounded-2xl"><Users className="h-4 w-4 mr-2"/>Usuários</TabsTrigger>
      </TabsList>

      <TabsContent value="transmissoes" className="mt-4">
        <TransmissionsAdmin />
      </TabsContent>
      <TabsContent value="grade" className="mt-4">
        <ScheduleGrid />
      </TabsContent>
      <TabsContent value="biblioteca" className="mt-4">
        <LibraryManager />
      </TabsContent>
      <TabsContent value="patrocinios" className="mt-4">
        <SponsorsManager />
      </TabsContent>
      <TabsContent value="relatorios" className="mt-4">
        <ReportsDemo />
      </TabsContent>
      <TabsContent value="seguranca" className="mt-4">
        <SecurityHints />
      </TabsContent>
      <TabsContent value="usuarios" className="mt-4">
        <UsersDemo />
      </TabsContent>
    </Tabs>
  );
}

function TransmissionsAdmin(){
  const [liveHls, setLiveHls] = useState("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
  const [rtmpServer, setRtmpServer] = useState("rtmp://seu-servidor/live");
  const [rtmpKey, setRtmpKey] = useState("canal123");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5"/> Configurar Live (OBS)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Use um servidor RTMP (ex.: Nginx-RTMP) e gere HLS/DASH para o player. OBS → {"{"}Servidor RTMP, Chave{ "}"}. Player usa HLS (URL .m3u8).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Servidor RTMP</Label>
            <Input value={rtmpServer} onChange={(e)=>setRtmpServer(e.target.value)} />
          </div>
          <div>
            <Label>Chave de Stream</Label>
            <Input value={rtmpKey} onChange={(e)=>setRtmpKey(e.target.value)} />
          </div>
          <div>
            <Label>URL HLS (para o Player)</Label>
            <Input value={liveHls} onChange={(e)=>setLiveHls(e.target.value)} />
          </div>
        </div>
        <div className="rounded-xl border p-3 text-sm bg-zinc-50 dark:bg-zinc-900">
          <div className="font-mono break-all">OBS → Servidor: <b>{rtmpServer}</b> • Chave: <b>{rtmpKey}</b></div>
          <div className="font-mono break-all">Player HLS: <b>{liveHls}</b></div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsDemo(){
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/> Estatísticas (demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Visualizações Hoje" value="1.482" />
            <Stat label="Tempo Assistido" value="96 h" />
            <Stat label="Assinantes Ativos" value="312" />
            <Stat label="CTR de Anúncios" value="3,4%" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Exportar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full rounded-2xl">Baixar CSV</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }){
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SecurityHints(){
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/> Segurança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>• Autenticação: implemente JWT + refresh tokens no backend.</p>
        <p>• Storage seguro para uploads (S3/GCS) com URLs temporárias.</p>
        <p>• RBAC: Admin, Editor, Assinante.</p>
        <p>• Logs e auditoria de acessos e agendamentos.</p>
        <p>• Rate limiting no RTMP ingest e nas APIs públicas.</p>
      </CardContent>
    </Card>
  );
}

function UsersDemo(){
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Usuários (demo)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Integre ao seu banco (MySQL/Postgres) via backend Node/Python. Esta visão é ilustrativa.</p>
      </CardContent>
    </Card>
  );
}

// --- Helpers
function toTodayTime(hhmm){
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function useTheme(){
  const [theme, setTheme] = useLocalState(LS_KEYS.theme, "light");
  useEffect(()=>{
    const root = document.documentElement;
    if(theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
  }, [theme]);
  return { theme, setTheme };
}

// --- Main App
export default function WebTVApp(){
  const [videos] = useLocalState(LS_KEYS.videos, defaultVideos);
  const autoPlaylist = useMemo(() => videos.filter(v => v.type !== "ad"), [videos]);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: COLORS.primary }}>
              <Tv className="h-5 w-5 text-white"/>
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">Web TV Pro</div>
              <div className="text-xs text-zinc-500">Ao vivo, Auto VJ e Grade</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <NavPill icon={<MonitorPlay className="h-4 w-4"/>} label="Início" href="#home"/>
            <NavPill icon={<Calendar className="h-4 w-4"/>} label="Programação" href="#schedule"/>
            <NavPill icon={<Film className="h-4 w-4"/>} label="Biblioteca" href="#library"/>
            <NavPill icon={<Settings className="h-4 w-4"/>} label="Admin" href="#admin"/>
            <NavPill icon={<User className="h-4 w-4"/>} label="Conta" href="#account"/>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={()=> setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl" style={{ background: COLORS.accent }}><Search className="h-4 w-4 mr-2"/>Buscar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buscar Conteúdo</DialogTitle>
                </DialogHeader>
                <Input placeholder="Digite um título, programa ou patrocinador…" />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-12">
        <section id="home" className="space-y-4">
          <WebTVPlayer hlsUrl={"https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"} autoPlaylist={autoPlaylist} />
        </section>

        <section id="schedule" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6"/> Programação</h2>
          <ScheduleGrid />
        </section>

        <section id="library" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6"/> Biblioteca</h2>
          <LibraryManager />
        </section>

        <section id="admin" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6"/> Painel Administrativo</h2>
          <AdminPanel />
        </section>

        <section id="account" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><User className="h-6 w-6"/> Sua Conta</h2>
          <AccountPanel />
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-zinc-500">© {new Date().getFullYear()} Web TV Pro • SEO otimizado, Modo claro/escuro</div>
          <div className="flex items-center gap-3 text-xs">
            <a href="#" className="hover:underline">Termos</a>
            <a href="#" className="hover:underline">Privacidade</a>
            <a href="#" className="hover:underline">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavPill({ icon, label, href }){
  return (
    <a href={href} className="px-3 py-1.5 rounded-2xl border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
      {icon}<span>{label}</span>
    </a>
  );
}
