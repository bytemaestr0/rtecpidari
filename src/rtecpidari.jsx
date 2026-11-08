import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Search, Edit, ArrowUp, Mic, Plus } from "lucide-react";

const T = {
  bg:"#000000", bgList:"#000000", bgNav:"#1C1C1E", bgInput:"#000000",
  bgSearch:"#1C1C1E", bgBubbleIn:"#262628", bgBubbleOut:"#32D65A", bgPill:"#191919", pillBorder:"rgba(255,255,255,0.18)",
  bgAvatar:"#3A3A5C", separator:"rgba(255,255,255,0.08)",
  textPrim:"#FFFFFF", textSec:"#8E8E93", textBubIn:"#FFFFFF", textBubOut:"#FFFFFF",
  tint:"#1B84FF", unreadDot:"#1B84FF",
};

const STORAGE_KEY = "sms_conversations_v1";
const sessionCodes = {};
const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const slideInTransition = { type:"tween", ease:"linear", duration:0.00 };

function fmt2(n) { return String(n).padStart(2, "0"); }
function formatDateTime(date) {
  const data = `${fmt2(date.getDate())}.${fmt2(date.getMonth()+1)}.${date.getFullYear()}`;
  const ora  = `${fmt2(date.getHours())}:${fmt2(date.getMinutes())}`;
  return { data, ora };
}
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
// "1:53 PM" -> "13:53"
function to24(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/.exec(t || "");
  if (!m) return t;
  let h = parseInt(m[1], 10) % 12;
  if (m[3] === "PM") h += 12;
  return `${fmt2(h)}:${m[2]}`;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
// Which calendar day a message belongs to (messages from the same day share a key,
// so no date/time separator is drawn between them).
function dayKey(msg) {
  const d = new Date(msg.ts || Date.now());
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
// Label above the first message of a day:
//   today -> "Today at 17:34", previous day -> "Yesterday at 12:19", older -> "Wed 10. Jun at 00:32"
function dayLabel(msg) {
  const d = new Date(msg.ts || Date.now());
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  const hm = `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
  const when = days === 0 ? `Today at ${hm}`
    : days === 1 ? `Yesterday at ${hm}`
    : `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} at ${hm}`;
  return `Text Message • SMS\n${when}`;
}

// Older saved messages only have a text time ("Ieri 3:10 PM", "Lun 11:22 AM", "1:53 PM").
// Give each one a real timestamp so its day can be worked out correctly.
const RO_WEEKDAYS = { Dum:0, Lun:1, Mar:2, Mie:3, Joi:4, Vin:5, Sam:6 };
function migrateConversations(convs) {
  const now = new Date();
  const withTime = (day, t) => {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/.exec(t || "");
    const d = new Date(day);
    if (m) { d.setHours((parseInt(m[1], 10) % 12) + (m[3] === "PM" ? 12 : 0), parseInt(m[2], 10), 0, 0); }
    return d.getTime();
  };
  const ticketTs = (c) => {
    const tm = c.messages.find(x => x.ticketData && /^\d{2}\.\d{2}\.\d{4}$/.test(x.ticketData.date || ""));
    if (!tm) return null;
    const [dd, mm, yy] = tm.ticketData.date.split(".").map(Number);
    const [hh, mi] = (tm.ticketData.time || "0:0").split(":").map(Number);
    return new Date(yy, mm - 1, dd, hh || 0, mi || 0).getTime();
  };
  return convs.map(c => {
    if (c.messages.every(m => m.ts)) return c;
    const anchor = ticketTs(c); // 7000/7001: the whole exchange belongs to the ticket's date/time
    return { ...c, messages: c.messages.map(m => {
      if (m.ts) return m;
      const t = m.time || "";
      let ts;
      if (anchor) ts = anchor;
      else if (t.includes("Ieri")) { const d = startOfDay(now); d.setDate(d.getDate() - 1); ts = withTime(d, t); }
      else if (RO_WEEKDAYS[t.split(" ")[0]] !== undefined) {
        const d = startOfDay(now); d.setDate(d.getDate() - 1);
        while (d.getDay() !== RO_WEEKDAYS[t.split(" ")[0]]) d.setDate(d.getDate() - 1);
        ts = withTime(d, t);
      } else ts = withTime(startOfDay(now), t);
      return { ...m, ts };
    }) };
  });
}
function buildReply(convId, userText) {
  if (!sessionCodes[convId]) {
    sessionCodes[convId] = { baseCode: Math.floor(1000 + Math.random() * 9000), count: 0 };
  } else {
    sessionCodes[convId].count += 1;
  }
  const code = sessionCodes[convId].baseCode + sessionCodes[convId].count;
  const dt = formatDateTime(new Date());
  return { type:"ticket", userText, code:`${userText}${code}`, date:dt.data, time:dt.ora };
}

// ── Persistent storage helpers ──
function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return migrateConversations(parsed);
    }
  } catch(e) {}
  return null;
}
function saveConversations(convs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs)); } catch(e) {}
}

const INITIAL_CONVERSATIONS = [
  {
    id:1, name:"7000", preview:"Bilet 21670021", time:"13:53", unread:0, lastMsgAt:1749550380000,
    messages:[
      { id:1, text:"2167", from:"me", time:"1:53 PM", status:"read" },
      { id:2, text:"Solicitarea este in curs de procesare.", from:"them", time:"1:53 PM", status:"read" },
      { id:3, msgType:"ticket", ticketData:{ userText:"2167", code:"21670021", date:"10.06.2026", time:"13:53" }, text:"Bilet 21670021", from:"them", time:"1:53 PM", status:"read" },
    ],
  },
  {
    id:2, name:"7001", preview:"Bilet 07930264", time:"13:53", unread:0, lastMsgAt:1749550320000,
    messages:[
      { id:1, text:"0793", from:"me", time:"11:58 PM", status:"read" },
      { id:2, text:"Solicitarea este in curs de procesare.", from:"them", time:"11:58 PM", status:"read" },
      { id:3, msgType:"ticket", ticketData:{ userText:"2167", code:"07930264", date:"10.06.2026", time:"11:58" }, text:"Bilet 07930264", from:"them", time:"1:53 PM", status:"read" },
    ],
  },
  {
    id:3, name:"Andrei", preview:"vnature nus", time:"9:38 AM", unread:2, lastMsgAt:1749538320000,
    messages:[
      { id:1, text:"Rtec trebu sa bage conditionere in trolice", from:"them", time:"9:10 AM", status:"read" },
      { id:2, text:"da uai parca is in parelca", from:"me", time:"9:42 AM", status:"read" },
      { id:3, text:"asta si zic uai, ce de facut?", from:"them", time:"9:53 AM", status:"read" },
      { id:4, text:"aplicatia asta zic ca ii destul", from:"me", time:"9:59 AM", status:"read" },
      { id:5, text:"rtec nu is sanatosi", from:"them", time:"10:01 AM", status:"read" },
      { id:6, text:"vnature nus", from:"me", time:"10:11 AM", status:"read" },
    ],
  },
  {
    id:4, name:"Nova Poshta", preview:"Coletul dvs. a sosit la oficiu.", time:"8:52 AM", unread:1, lastMsgAt:1749537120000,
    messages:[
      { id:1, text:"Nova Poshta: Coletul #59031824 a fost expediat. Livrare estimata: 09.06. Urmarire: novaposhta.ua", from:"them", time:"Ieri 3:10 PM", status:"read" },
      { id:2, text:"Nova Poshta: Coletul dvs. #59031824 a ajuns in orasul destinatiei.", from:"them", time:"Ieri 9:44 PM", status:"read" },
      { id:3, text:"Nova Poshta: Coletul dvs. a sosit la oficiu. Adresa: str. Ismail 90. Program: 08:00–21:00.", from:"them", time:"8:52 AM", status:"delivered" },
    ],
  },
  {
    id:5, name:"Orange MD", preview:"Ai activat pachetul 5 GB.", time:"Ieri", unread:0, lastMsgAt:1749463200000,
    messages:[
      { id:1, text:"Orange: Soldul tau este 47.20 MDL. Pentru reincarcari rapide acceseaza MyOrange.", from:"them", time:"Ieri 10:00 AM", status:"read" },
      { id:2, text:"Orange: Ai activat pachetul Internet 5 GB – valabil 30 zile. Multumim!", from:"them", time:"Ieri 10:01 AM", status:"read" },
      { id:3, text:"Orange: Internetul tau expira in 3 zile. Reincarca acum si beneficiezi de 10% bonus.", from:"them", time:"Ieri 6:00 PM", status:"read" },
    ],
  },
  {
    id:6, name:"Google", preview:"Codul tau Google este 847 291.", time:"Ieri", unread:0, lastMsgAt:1749452220000,
    messages:[
      { id:1, text:"G-851047 este codul tau de verificare Google. Nu il impartasi cu nimeni.", from:"them", time:"Lun 11:22 AM", status:"read" },
      { id:2, text:"G-203918 este codul tau de verificare Google. Nu il impartasi cu nimeni.", from:"them", time:"Mar 9:05 AM", status:"read" },
      { id:3, text:"Codul tau Google este 847 291. Nu il impartasi cu nimeni.", from:"them", time:"Ieri 2:17 PM", status:"read" },
    ],
  },
  {
    id:7, name:"Instagram", preview:"Codul tau Instagram este 392 817.", time:"Lun", unread:1, lastMsgAt:1749290580000,
    messages:[
      { id:1, text:"Instagram: Cineva a incercat sa se conecteze la contul tau. Daca nu esti tu, schimba parola.", from:"them", time:"Vin 9:14 AM", status:"read" },
      { id:2, text:"Instagram: Codul tau de confirmare este 482 031. Nu il impartasi cu nimeni.", from:"them", time:"Vin 9:15 AM", status:"read" },
      { id:3, text:"Instagram: Codul tau Instagram este 392 817.", from:"them", time:"Lun 11:03 AM", status:"delivered" },
    ],
  },
  {
    id:8, name:"Facebook", preview:"Foloseste 748 291 ca parola ta Facebook.", time:"Lun", unread:0, lastMsgAt:1749285720000,
    messages:[
      { id:1, text:"Facebook: A fost detectata o autentificare noua din Chisinau, Moldova. Nu esti tu? Securizeaza-ti contul.", from:"them", time:"Joi 4:22 PM", status:"read" },
      { id:2, text:"Facebook: Foloseste 748 291 ca parola ta temporara Facebook. Nu o impartasi cu nimeni.", from:"them", time:"Lun 8:47 AM", status:"read" },
    ],
  },
  {
    id:9, name:"enter.md", preview:"Comanda ta #EN-40812 a fost confirmata.", time:"Mar", unread:2, lastMsgAt:1749203460000,
    messages:[
      { id:1, text:"enter.md: Comanda ta #EN-40812 a fost plasata cu succes. Total: 1.249 MDL. Livrare: 2-3 zile lucratoare.", from:"them", time:"Mar 10:05 AM", status:"read" },
      { id:2, text:"enter.md: Comanda #EN-40812 este in curs de procesare. Vei fi notificat cand expedierea este confirmata.", from:"them", time:"Mar 10:31 AM", status:"delivered" },
    ],
  },
  {
    id:10, name:"999.md", preview:"Anuntul tau a fost activat.", time:"Mie", unread:0, lastMsgAt:1749117360000,
    messages:[
      { id:1, text:"999.md: Anuntul tau \"Apartament 2 camere, Botanica\" a fost publicat cu succes. ID: 28834712.", from:"them", time:"Mie 9:00 AM", status:"read" },
      { id:2, text:"999.md: Ai primit 3 mesaje noi pentru anuntul tau. Intra pe 999.md pentru a raspunde.", from:"them", time:"Mie 2:15 PM", status:"read" },
      { id:3, text:"999.md: Anuntul tau a fost activat si este vizibil pentru toti utilizatorii.", from:"them", time:"Mie 2:16 PM", status:"read" },
    ],
  },
  {
    id:11, name:"WhatsApp", preview:"Codul tau WhatsApp: 491-837", time:"Joi", unread:0, lastMsgAt:1749031380000,
    messages:[
      { id:1, text:"WhatsApp: Codul tau WhatsApp: 491-837. Nu il impartasi cu nimeni. rJbA/XP1K V", from:"them", time:"Joi 7:43 AM", status:"read" },
      { id:2, text:"WhatsApp: Contul tau a fost inregistrat pe un dispozitiv nou. Daca nu esti tu, verifica securitatea contului.", from:"them", time:"Joi 7:44 AM", status:"read" },
    ],
  },
];

function Avatar({ size = 44 }) {
  // Matches the iOS "unknown contact" picture: violet gradient, white head + shoulders.
  const head = size*0.36, bodyW = size*0.6;
  return (
    <div style={{ width:size, height:size, minWidth:size, borderRadius:"50%", background:"linear-gradient(180deg, #5A566F 0%, #2E2949 100%)", flexShrink:0, overflow:"hidden", position:"relative", boxSizing:"border-box" }}>
      <div style={{ position:"absolute", width:head, height:head, borderRadius:"50%", background:"#FFFFFF", top:size*0.2, left:"50%", transform:"translateX(-50%)" }}/>
      <div style={{ position:"absolute", width:bodyW, height:size*0.45, borderRadius:`${bodyW/2}px ${bodyW/2}px 0 0 / ${size*0.14}px ${size*0.14}px 0 0`, background:"#FFFFFF", top:size*0.65, left:"50%", transform:"translateX(-50%)" }}/>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ padding:"2px 0 4px" }}>
      <div style={{ background:T.bgBubbleIn, borderRadius:"18px 18px 18px 4px", padding:"10px 14px", display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} style={{ width:7, height:7, borderRadius:"50%", background:T.textSec }}
            animate={{ y:[0,-4,0] }} transition={{ duration:0.55, repeat:Infinity, delay:i*0.15, ease:"easeInOut" }}/>
        ))}
      </div>
    </div>
  );
}

function BubbleContent({ msg }) {
  if (msg.msgType === "ticket") {
    const { userText, code, date, time } = msg.ticketData;
    return (
      <span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {"Bilet electronic nr. "}
        <span style={{ color:"#1B84FF", textDecoration:"underline", fontWeight:500 }}>{code}</span>
        {`\n Data ${date} ora ${time}\n Valabil `}
        <u>1</u>
        {` ora\n Pret `}
        <u>7 MDL</u>
        {`\n Numar de bord ${userText}`}
      </span>
    );
  }
  return <span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{msg.text}</span>;
}

function ConversationList({ conversations, onSelect, searchQuery, setSearchQuery }) {
  // Sort by lastMsgAt descending (most recent first)
  const sorted = [...conversations].sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0));
  const filtered = sorted.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width:"100%", height:"100%", background:T.bgList, display:"flex", flexDirection:"column", fontFamily:sf, overflow:"hidden" }}>
      <div style={{ paddingTop:"env(safe-area-inset-top, 16px)", paddingLeft:16, paddingRight:16, paddingBottom:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 0", fontSize:17, color:T.tint, fontFamily:sf }}>Edit</button>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:8 }}>
          <Edit size={20} strokeWidth={1.8} color={T.tint}/>
        </button>
      </div>
      <div style={{ padding:"2px 16px 8px" }}>
        <span style={{ fontSize:34, fontWeight:700, letterSpacing:-0.5, color:T.textPrim }}>Messages</span>
      </div>
      <div style={{ padding:"0 16px 8px" }}>
        <div style={{ background:T.bgSearch, borderRadius:10, display:"flex", alignItems:"center", padding:"8px 10px", gap:8 }}>
          <Search size={16} color={T.textSec} strokeWidth={2}/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search"
            style={{ border:"none", background:"transparent", fontSize:17, color:T.textPrim, outline:"none", flex:1, fontFamily:sf }}/>
          {searchQuery
            ? <button onClick={() => setSearchQuery("")} style={{ background:"#636366", border:"none", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, flexShrink:0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            : <Mic size={17} color={T.textSec} strokeWidth={1.8}/>
          }
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:T.textSec, fontSize:16 }}>No results</div>
        )}
        {filtered.map((conv, i) => (
          <motion.div key={conv.id} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:i*0.03, duration:0.2 }} whileTap={{ backgroundColor:"rgba(255,255,255,0.06)" }}
            onClick={() => onSelect(conv)} style={{ cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"11px 16px", gap:12, borderBottom:`0.5px solid ${T.separator}` }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <Avatar size={52}/>
                {conv.unread > 0 && (
                  <div style={{ position:"absolute", top:-2, right:-2, background:T.unreadDot, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", border:`2px solid ${T.bgList}` }}>
                    {conv.unread}
                  </div>
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                  <span style={{ fontSize:17, fontWeight:conv.unread>0?600:400, color:T.textPrim, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"64%" }}>
                    {conv.name}
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                    <span style={{ fontSize:15, color:T.textSec }}>{conv.time}</span>
                    <ChevronLeft size={15} color="#636366" style={{ transform:"rotate(180deg)" }}/>
                  </div>
                </div>
                <span style={{ fontSize:15, color:T.textSec, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block", textAlign:"left", fontWeight:conv.unread>0?500:400 }}>
                  {conv.preview}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        <div style={{ height:"env(safe-area-inset-bottom, 24px)" }}/>
      </div>
    </div>
  );
}

function ChatView({ conversation, onBack, onSendMessage }) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef(null);
  const contentRef = useRef(null);
  const inputRef = useRef(null);
  const stickRef = useRef(true); // keep the view pinned to the bottom unless the user scrolled up
  const initialIds = useRef(new Set(conversation.messages.map(m => m.id))); // already there on open -> no entrance animation
  const isBot = conversation.name === "7000" || conversation.name === "7001";

  // Jump to the latest message instantly when the chat opens.
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // New bubbles / the typing indicator grow in smoothly (height animation). Following that
  // growth frame by frame with a ResizeObserver keeps the scroll glued to the bottom, instead of
  // restarting a smooth-scroll on every change (which is what made it snap).
  useEffect(() => {
    const el = messagesContainerRef.current, content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    stickRef.current = true;
    onSendMessage(conversation.id, text, "me");
    if (isBot) {
      setTimeout(() => {
        onSendMessage(conversation.id, "Solicitarea este in curs de procesare.", "them");
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const reply = buildReply(conversation.id, text);
          onSendMessage(conversation.id, null, "them", reply);
        }, 1000);
      }, 400);
    }
  };

  const msgs = conversation.messages;
  const grouped = msgs.map((msg, i) => {
    const prev = msgs[i-1], next = msgs[i+1];
    return { ...msg, isFirst:!prev||prev.from!==msg.from, isLast:!next||next.from!==msg.from };
  });

  // Date separator only when the day changes (not between messages of the same day).
  const items = [];
  let lastDay = null;
  grouped.forEach(msg => {
    const key = dayKey(msg);
    if (key !== lastDay) { items.push({ type:"date", id:`date-${msg.id}`, label:dayLabel(msg) }); lastDay = key; }
    items.push({ type:"msg", ...msg });
  });

  const hasInput = input.length > 0;
  const HEADER_TOP = "calc(env(safe-area-inset-top, 14px) + 4px)";
  const MSG_PAD_TOP = "calc(env(safe-area-inset-top, 14px) + 101px)";
  const pillBorder = `1px solid ${T.pillBorder}`;
  const growIn = (fresh) => ({
    initial: fresh ? { opacity:0, height:0 } : false,
    animate: { opacity:1, height:"auto" },
    transition: { height:{ duration:0.32, ease:[0.22,1,0.36,1] }, opacity:{ duration:0.24, ease:"easeOut" } },
  });

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", background:T.bg, fontFamily:sf, position:"relative" }}>
      {/* Back pill with unread badge */}
      <button onClick={onBack} style={{ position:"absolute", top:`calc(${HEADER_TOP} + 1px)`, left:16, zIndex:30, height:43, boxSizing:"border-box", background:T.bgPill, border:pillBorder, borderRadius:22, display:"flex", alignItems:"center", gap:10, padding:"0 17px 0 13px", cursor:"pointer" }}>
        <svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M9 1.8L1.8 9L9 16.2" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ background:"#F2F2F2", color:"#1C1C1E", fontSize:16, fontWeight:600, lineHeight:"19px", height:19, minWidth:33, padding:"0 7px", boxSizing:"border-box", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:sf }}>109</span>
      </button>
      {/* Avatar + name pill */}
      <div style={{ position:"absolute", top:HEADER_TOP, left:0, right:0, zIndex:29, display:"flex", flexDirection:"column", alignItems:"center", pointerEvents:"none" }}>
        <Avatar size={60}/>
        <div style={{ marginTop:-4, height:32, boxSizing:"border-box", background:T.bgPill, border:pillBorder, borderRadius:16, display:"flex", alignItems:"center", gap:4, padding:"0 10px 0 13px", pointerEvents:"auto", position:"relative" }}>
          <span style={{ fontSize:17, fontWeight:700, color:T.textPrim, fontFamily:sf, letterSpacing:-0.2 }}>{conversation.name}</span>
          <ChevronLeft size={12} strokeWidth={2.6} color={T.textSec} style={{ transform:"rotate(180deg)" }}/>
        </div>
      </div>
      {/* Messages area */}
      <div ref={messagesContainerRef} onScroll={handleScroll} style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch", paddingTop:MSG_PAD_TOP, paddingBottom:"8px", minHeight:0, overflowAnchor:"none" }}>
        <div ref={contentRef}>
          {items.map(item =>
            item.type === "date" ? (
              <div key={item.id} style={{ textAlign:"center", margin:"14px 0 0", display:"flex", flexDirection:"column" }}>
                {item.label.split("\n").map((line, li) => (
                  <span key={li} style={{ fontSize:11.5, lineHeight:"14px", color:T.textSec, fontWeight:400 }}>{line}</span>
                ))}
              </div>
            ) : (
              <motion.div key={item.id} {...growIn(!initialIds.current.has(item.id))} style={{ overflow:"hidden" }}>
                <div style={{ display:"flex", flexDirection:item.from==="me"?"row-reverse":"row", alignItems:"flex-end", padding:`${item.isFirst?9:2}px 16px 2px` }}>
                  <motion.div
                    initial={initialIds.current.has(item.id) ? false : { y:10, scale:0.9 }}
                    animate={{ y:0, scale:1 }}
                    transition={{ type:"spring", stiffness:420, damping:34, mass:0.8 }}
                    style={{ maxWidth:"75%", display:"flex", flexDirection:"column", alignItems:item.from==="me"?"flex-end":"flex-start", transformOrigin:item.from==="me"?"100% 100%":"0% 100%" }}>
                    <div className={`bubble ${item.from==="me"?"out":"in"}${item.isLast?" tail":""}`}
                      style={{ "--bubble-bg":item.from==="me"?T.bgBubbleOut:T.bgBubbleIn, background:item.from==="me"?T.bgBubbleOut:T.bgBubbleIn, color:T.textPrim,
                        borderRadius:20, padding:"9px 15px 10px", fontSize:17, lineHeight:"21px", textAlign:"left" }}>
                      <BubbleContent msg={item}/>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )
          )}
          <AnimatePresence initial={false}>
            {isTyping && (
              <motion.div key="typing" {...growIn(true)} exit={{ opacity:0, height:0, transition:{ duration:0.2, ease:"easeIn" } }} style={{ overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"flex-end", padding:"9px 16px 2px" }}><TypingDots/></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Input bar */}
      <div style={{ background:T.bgInput, padding:"8px 28px", paddingBottom:"max(12px, calc(env(safe-area-inset-bottom, 0px) - 4px))", display:"flex", alignItems:"center", gap:13, flexShrink:0 }}>
        <button style={{ background:T.bgPill, border:pillBorder, borderRadius:"50%", width:39, height:39, boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, padding:0 }}>
          <Plus size={22} color="#FFFFFF" strokeWidth={2.4}/>
        </button>
        <div style={{ flex:1, minWidth:0, height:39, boxSizing:"border-box", background:T.bgPill, border:pillBorder, borderRadius:20, display:"flex", alignItems:"center", padding:"0 4px 0 17px", gap:6 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Text Message • SMS"
            style={{ flex:1, border:"none", background:"transparent", fontSize:17, color:T.textPrim, outline:"none", fontFamily:sf, minWidth:0, padding:0 }}/>
          {hasInput ? (
            <button onClick={handleSend} style={{ background:"#34C759", border:"none", borderRadius:"50%", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, padding:0 }}>
              <ArrowUp size={18} color="#fff" strokeWidth={2.8}/>
            </button>
          ) : (
            <div style={{ width:30, height:30, marginRight:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Mic size={20} color={T.textSec} strokeWidth={1.8}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Load from localStorage on first render, fall back to INITIAL_CONVERSATIONS
  const [conversations, setConversations] = useState(() => loadConversations() ?? migrateConversations(INITIAL_CONVERSATIONS));
  const [activeId, setActiveId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-save whenever conversations change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const handleSelect = conv => {
    setConversations(prev => prev.map(c => c.id===conv.id ? { ...c, unread:0 } : c));
    setActiveId(conv.id);
  };

  const handleSendMessage = (convId, text, from="me", ticketData=null) => {
    const now = new Date();
    const h = now.getHours(), m = String(now.getMinutes()).padStart(2,"0");
    const timeStr = `${h%12||12}:${m} ${h<12?"AM":"PM"}`;
    const ts = now.getTime(); // timestamp for sorting
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const newMsg = ticketData
        ? { id:Date.now()+Math.random(), ts, msgType:"ticket", ticketData, text:`Bilet ${ticketData.code}`, from, time:timeStr, status:"read" }
        : { id:Date.now()+Math.random(), ts, text, from, time:timeStr, status:from==="me"?"delivered":"read" };
      return { ...c, messages:[...c.messages, newMsg], preview:newMsg.text, time:"Now", lastMsgAt:ts };
    }));
  };

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <div style={{ position:"fixed", inset:0, width:"100%", height:"100%", fontFamily:sf, background:T.bg, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0 }}>
        <ConversationList conversations={conversations} onSelect={handleSelect} searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>
      </div>
      <AnimatePresence>
        {activeConv && (
          <motion.div key={`chat-${activeConv.id}`} initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
            transition={slideInTransition} style={{ position:"absolute", inset:0, willChange:"transform" }}>
            <ChatView conversation={activeConv} onBack={() => setActiveId(null)} onSendMessage={handleSendMessage}/>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
