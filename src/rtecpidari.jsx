import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, Search, Edit, Phone, Video,
  Send, Mic, Smile, Camera, Plus, CheckCheck, Check,
} from "lucide-react";

/* ── Theme ─────────────────────────────────────────────────────── */
const T = {
  bg:         "#000000",
  bgList:     "#000000",
  bgNav:      "#1C1C1E",
  bgInput:    "#1C1C1E",
  bgSearch:   "#1C1C1E",
  bgBubbleIn: "#2C2C2E",
  bgBubbleOut:"#1B84FF",   // slightly brighter blue matching screenshot
  bgAvatar:   "#636366",
  separator:  "rgba(255,255,255,0.08)",
  textPrim:   "#FFFFFF",
  textSec:    "#8E8E93",
  textBubIn:  "#FFFFFF",
  textBubOut: "#FFFFFF",
  tint:       "#1B84FF",
  unreadDot:  "#1B84FF",
};

const AVATARS = {
  "7000":        { bg: "#636366", initials: "70" },
  "7001":        { bg: "#636366", initials: "70" },
  "Nica":        { bg: "#636366", initials: "N"  },
  "Nova Poshta": { bg: "#636366", initials: "NP" },
  "Orange MD":   { bg: "#636366", initials: "OR" },
  "Google":      { bg: "#636366", initials: "G"  },
};

const sessionCodes = {};

function fmt2(n) { return String(n).padStart(2, "0"); }
function formatDateTime(date) {
  return `${fmt2(date.getDate())}.${fmt2(date.getMonth()+1)}.${date.getFullYear()} ${fmt2(date.getHours())}:${fmt2(date.getMinutes())}`;
}
function buildReply(convId, userText) {
  if (!sessionCodes[convId]) {
    sessionCodes[convId] = { baseCode: Math.floor(1000 + Math.random() * 9000), count: 0 };
  } else {
    sessionCodes[convId].count += 1;
  }
  const code = sessionCodes[convId].baseCode + sessionCodes[convId].count;
  const now = new Date();
  const plus1 = new Date(now.getTime() + 3600000);
  return `Bilet electronic nr.\n${userText}${code},\n Data ${formatDateTime(now)}, ${formatDateTime(plus1)}\nValabil 1 ora\nPret 7 MDL\n Numar de bord 2167`;
}

const INITIAL_CONVERSATIONS = [
  { id:1, name:"7000", preview:"", time:"", unread:0, messages:[] },
  { id:2, name:"7001", preview:"", time:"", unread:0, messages:[] },
  {
    id:3, name:"Nica", preview:"vii maine sau nu?", time:"9:38 AM", unread:2,
    messages:[
      { id:1, text:"salut, ce faci?", from:"them", time:"9:10 AM", status:"read" },
      { id:2, text:"bine bine, tu?", from:"me", time:"9:12 AM", status:"read" },
      { id:3, text:"si eu ok. mergi azi la sala?", from:"them", time:"9:13 AM", status:"read" },
      { id:4, text:"nu stiu inca, poate seara", from:"me", time:"9:15 AM", status:"read" },
      { id:5, text:"vii maine sau nu?", from:"them", time:"9:38 AM", status:"delivered" },
    ],
  },
  {
    id:4, name:"Nova Poshta", preview:"Coletul dvs. a sosit la oficiu.", time:"8:52 AM", unread:1,
    messages:[
      { id:1, text:"Nova Poshta: Coletul #59031824 a fost expediat. Livrare estimata: 09.06. Urmarire: novaposhta.ua", from:"them", time:"Ieri 3:10 PM", status:"read" },
      { id:2, text:"Nova Poshta: Coletul dvs. #59031824 a ajuns in orasul destinatiei.", from:"them", time:"Ieri 9:44 PM", status:"read" },
      { id:3, text:"Nova Poshta: Coletul dvs. a sosit la oficiu. Adresa: str. Ismail 90. Program: 08:00–21:00.", from:"them", time:"8:52 AM", status:"delivered" },
    ],
  },
  {
    id:5, name:"Orange MD", preview:"Ai activat pachetul 5 GB.", time:"Ieri", unread:0,
    messages:[
      { id:1, text:"Orange: Soldul tau este 47.20 MDL. Pentru reincarcari rapide acceseaza MyOrange.", from:"them", time:"Ieri 10:00 AM", status:"read" },
      { id:2, text:"Orange: Ai activat pachetul Internet 5 GB – valabil 30 zile. Multumim!", from:"them", time:"Ieri 10:01 AM", status:"read" },
      { id:3, text:"Orange: Internetul tau expira in 3 zile. Reincarca acum si beneficiezi de 10% bonus.", from:"them", time:"Ieri 6:00 PM", status:"read" },
    ],
  },
  {
    id:6, name:"Google", preview:"Codul tau Google este 847 291.", time:"Ieri", unread:0,
    messages:[
      { id:1, text:"G-851047 este codul tau de verificare Google. Nu il impartasi cu nimeni.", from:"them", time:"Lun 11:22 AM", status:"read" },
      { id:2, text:"G-203918 este codul tau de verificare Google. Nu il impartasi cu nimeni.", from:"them", time:"Mar 9:05 AM", status:"read" },
      { id:3, text:"Codul tau Google este 847 291. Nu il impartasi cu nimeni.", from:"them", time:"Ieri 2:17 PM", status:"read" },
    ],
  },
];

const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

function Avatar({ name, size = 44 }) {
  const cfg = AVATARS[name] || { bg: T.bgAvatar, initials: name?.[0]?.toUpperCase() || "?" };
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", background:cfg.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.34, fontWeight:600, color:"#EBEBF5CC", flexShrink:0, fontFamily:sf,
      letterSpacing:-0.3,
    }}>
      {cfg.initials}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ padding:"2px 0 4px" }}>
      <div style={{ background:T.bgBubbleIn, borderRadius:"18px 18px 18px 4px", padding:"10px 14px", display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <motion.div key={i}
            style={{ width:7, height:7, borderRadius:"50%", background:T.textSec }}
            animate={{ y:[0,-4,0] }}
            transition={{ duration:0.55, repeat:Infinity, delay:i*0.15, ease:"easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Conversation List ─────────────────────────────────────────── */
function ConversationList({ conversations, onSelect, searchQuery, setSearchQuery }) {
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width:"100%", height:"100%", background:T.bgList, display:"flex", flexDirection:"column", fontFamily:sf, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ paddingTop:"env(safe-area-inset-top, 16px)", paddingLeft:16, paddingRight:16, paddingBottom:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 0", fontSize:17, color:T.tint, fontFamily:sf }}>
          Edit
        </button>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:8 }}>
          <Edit size={20} strokeWidth={1.8} color={T.tint} />
        </button>
      </div>

      {/* Large title */}
      <div style={{ padding:"2px 16px 8px" }}>
        <span style={{ fontSize:34, fontWeight:700, letterSpacing:-0.5, color:T.textPrim }}>Messages</span>
      </div>

      {/* Search */}
      <div style={{ padding:"0 16px 8px" }}>
        <div style={{ background:T.bgSearch, borderRadius:10, display:"flex", alignItems:"center", padding:"8px 10px", gap:8 }}>
          <Search size={16} color={T.textSec} strokeWidth={2} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search"
            style={{ border:"none", background:"transparent", fontSize:17, color:T.textPrim, outline:"none", flex:1, fontFamily:sf }}
          />
          {searchQuery
            ? <button onClick={() => setSearchQuery("")} style={{ background:"#636366", border:"none", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, flexShrink:0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            : <Mic size={17} color={T.textSec} strokeWidth={1.8} />
          }
        </div>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:T.textSec, fontSize:16 }}>No results</div>
        )}
        {filtered.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity:0, x:-16 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay:i*0.03, duration:0.2 }}
            whileTap={{ backgroundColor:"rgba(255,255,255,0.06)" }}
            onClick={() => onSelect(conv)}
            style={{ cursor:"pointer" }}
          >
            <div style={{ display:"flex", alignItems:"center", padding:"11px 16px", gap:12, borderBottom:`0.5px solid ${T.separator}` }}>
              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <Avatar name={conv.name} size={52} />
                {conv.unread > 0 && (
                  <div style={{ position:"absolute", top:-2, right:-2, background:T.unreadDot, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", border:`2px solid ${T.bgList}` }}>
                    {conv.unread}
                  </div>
                )}
              </div>
              {/* Text */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                  <span style={{ fontSize:17, fontWeight: conv.unread>0 ? 600 : 400, color:T.textPrim, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"64%" }}>
                    {conv.name}
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                    <span style={{ fontSize:15, color:T.textSec }}>{conv.time}</span>
                    <ChevronLeft size={15} color="#636366" style={{ transform:"rotate(180deg)" }} />
                  </div>
                </div>
                <span style={{ fontSize:15, color:T.textSec, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block", fontWeight: conv.unread>0 ? 500 : 400 }}>
                  {conv.preview}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        <div style={{ height:"env(safe-area-inset-bottom, 24px)" }} />
      </div>
    </div>
  );
}

/* ── Chat View ─────────────────────────────────────────────────── */
function ChatView({ conversation, onBack, onSendMessage }) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isBot = conversation.name==="7000" || conversation.name==="7001";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [conversation.messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSendMessage(conversation.id, text, "me");
    if (isBot) {
      setTimeout(() => {
        onSendMessage(conversation.id, "Solicitare in curs de procesare.", "them");
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          onSendMessage(conversation.id, buildReply(conversation.id, text), "them");
        }, 1000);
      }, 400);
    }
  };

  const msgs = conversation.messages;

  // Group messages: consecutive same-sender messages are grouped
  // Only show timestamp above first message of a group, "Delivered/Read" below last "me" bubble
  const grouped = [];
  msgs.forEach((msg, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    const isFirst = !prev || prev.from !== msg.from;
    const isLast  = !next || next.from !== msg.from;
    grouped.push({ ...msg, isFirst, isLast });
  });

  // Build items list with date separators
  const items = [];
  let lastDateLabel = null;
  grouped.forEach(msg => {
    // Determine date label
    const t = msg.time || "";
    const label = t.includes("Ieri") ? "Ieri"
      : t.includes("Lun") ? "Luni"
      : t.includes("Mar") ? "Marti"
      : (t.includes("AM") || t.includes("PM")) ? "iMessage\nToday " + t.split(" ").slice(-2).join(" ")
      : t.split(" ")[0];

    if (label !== lastDateLabel) {
      items.push({ type:"date", label });
      lastDateLabel = label;
    }
    items.push({ type:"msg", ...msg });
  });

  // Helper: status label text (shown below last "me" bubble only)
  const getStatusLabel = (msg) => {
    if (msg.from !== "me") return null;
    if (msg.status === "read") return "Read";
    if (msg.status === "delivered") return "Delivered";
    return "Sent";
  };

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", background:T.bg, fontFamily:sf }}>

      {/* ── Nav bar — matches screenshot exactly ── */}
      <div style={{
        background:"#1C1C1E",
        borderBottom:`0.5px solid ${T.separator}`,
        paddingTop:"env(safe-area-inset-top, 14px)",
        paddingBottom:10,
        display:"flex", alignItems:"center", flexShrink:0,
        position:"relative",
      }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background:"none", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", color:T.tint,
            gap:1, padding:"4px 4px 4px 2px",
            position:"absolute", left:6, top:"50%", transform:"translateY(-50%)",
            zIndex:2,
          }}
        >
          <ChevronLeft size={28} strokeWidth={2.2} color={T.tint} />
        </button>

        {/* Center: avatar + name + chevron */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, paddingTop:2 }}>
          <Avatar name={conversation.name} size={38} />
          <div style={{ display:"flex", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:12, fontWeight:600, color:T.textPrim, letterSpacing:-0.1 }}>
              {conversation.name}
            </span>
            <ChevronLeft size={11} color={T.textSec} style={{ transform:"rotate(180deg)", marginTop:0.5 }} />
          </div>
        </div>

        {/* Video icon — top right, outlined square with triangle (iMessage style) */}
        <button style={{
          background:"none", border:"none", cursor:"pointer",
          padding:"4px 14px 4px 8px",
          position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
        }}>
          <Video size={22} color={T.tint} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch", padding:"4px 0 8px" }}>

        {/* Empty state */}
        {items.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10, paddingBottom:60 }}>
            <Avatar name={conversation.name} size={72} />
            <span style={{ fontSize:20, fontWeight:600, color:T.textPrim }}>{conversation.name}</span>
            <span style={{ fontSize:14, color:T.textSec }}>No messages</span>
          </div>
        )}

        {items.map((item, idx) =>
          item.type === "date" ? (
            /* Date / channel label — matches "iMessage\nToday 1:53 PM" */
            <div key={`d${idx}`} style={{
              textAlign:"center",
              margin:"14px 0 10px",
              display:"flex", flexDirection:"column", gap:1,
            }}>
              {item.label.split("\n").map((line, li) => (
                <span key={li} style={{
                  fontSize:12,
                  color:T.textSec,
                  fontWeight: li === 0 ? 500 : 400,
                  letterSpacing: li === 0 ? 0 : -0.1,
                }}>
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <motion.div
              key={item.id}
              initial={{ opacity:0, y:6, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ duration:0.16, ease:[0.25,0.46,0.45,0.94] }}
              style={{
                display:"flex",
                flexDirection: item.from==="me" ? "row-reverse" : "row",
                alignItems:"flex-end",
                /* tighter vertical gaps within group, small gap between groups */
                padding: item.isFirst
                  ? `${item.from==="me" ? "6" : "6"}px 12px 1px`
                  : "1px 12px 1px",
                gap:6,
              }}
            >
              {/* No avatar shown in 1:1 chats (matches screenshot) */}
              {/* Bubble */}
              <div style={{ maxWidth:"75%", display:"flex", flexDirection:"column", alignItems: item.from==="me" ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: item.from==="me" ? T.bgBubbleOut : T.bgBubbleIn,
                  color: item.from==="me" ? T.textBubOut : T.textBubIn,
                  /* Tail: on last bubble of group only */
                  borderRadius: item.from==="me"
                    ? (item.isLast ? "20px 20px 5px 20px" : "20px 20px 20px 20px")
                    : (item.isLast ? "20px 20px 20px 5px" : "20px 20px 20px 20px"),
                  padding:"9px 14px",
                  fontSize:17,
                  lineHeight:1.4,
                  wordBreak:"break-word",
                  whiteSpace:"pre-wrap",
                }}>
                  {item.text}
                </div>

                {/* "Delivered" / "Read" label — only on the very last outgoing bubble */}
                {item.isLast && item.from === "me" && (
                  <div style={{
                    fontSize:12,
                    color:T.textSec,
                    marginTop:3,
                    paddingRight:2,
                    letterSpacing:-0.1,
                  }}>
                    {getStatusLabel(item)}
                  </div>
                )}
              </div>
            </motion.div>
          )
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div key="typing" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, padding:"2px 12px" }}>
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar — matches screenshot exactly ── */}
      <div style={{
        background:T.bgInput,
        borderTop:`0.5px solid ${T.separator}`,
        padding:"8px 12px",
        paddingBottom:"calc(10px + env(safe-area-inset-bottom, 0px))",
        display:"flex", alignItems:"flex-end", gap:10, flexShrink:0,
      }}>
        {/* + button */}
        <button style={{
          background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%",
          width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0, marginBottom:1,
        }}>
          <Plus size={20} color={T.tint} strokeWidth={2.5} />
        </button>

        {/* Text field pill */}
        <div style={{
          flex:1,
          background:"transparent",
          border:`1px solid #3A3A3C`,
          borderRadius:22,
          display:"flex", alignItems:"center",
          padding:"8px 14px",
          minHeight:36,
          gap:6,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleSend()}
            placeholder="iMessage"
            style={{
              flex:1, border:"none", background:"transparent",
              fontSize:17, color:T.textPrim, outline:"none",
              fontFamily:sf, lineHeight:1.4, minWidth:0,
            }}
          />
        </div>

        {/* Right action button — mic when empty, send when typing */}
        <AnimatePresence mode="wait">
          {input ? (
            <motion.button key="send"
              initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
              transition={{ type:"spring", stiffness:400, damping:22 }}
              onClick={handleSend}
              style={{
                background:T.tint, border:"none", borderRadius:"50%",
                width:34, height:34, display:"flex", alignItems:"center",
                justifyContent:"center", cursor:"pointer", flexShrink:0,
              }}
            >
              <Send size={16} color="#fff" strokeWidth={2.2} style={{ transform:"translateX(1px) translateY(-1px)" }} />
            </motion.button>
          ) : (
            <motion.button key="mic"
              initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
              transition={{ type:"spring", stiffness:400, damping:22 }}
              style={{
                background:"none", border:"none", borderRadius:"50%",
                width:34, height:34, display:"flex", alignItems:"center",
                justifyContent:"center", cursor:"pointer", flexShrink:0,
              }}
            >
              <Mic size={22} color={T.textSec} strokeWidth={1.8} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Root ──────────────────────────────────────────────────────── */
export default function App() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelect = conv => {
    setConversations(prev => prev.map(c => c.id===conv.id ? { ...c, unread:0 } : c));
    setActiveId(conv.id);
  };

  const handleSendMessage = (convId, text, from="me") => {
    const now = new Date();
    const h = now.getHours(), m = String(now.getMinutes()).padStart(2,"0");
    const timeStr = `${h%12||12}:${m} ${h<12?"AM":"PM"}`;
    setConversations(prev => prev.map(c => {
      if (c.id!==convId) return c;
      return {
        ...c,
        messages:[...c.messages, { id:Date.now()+Math.random(), text, from, time:timeStr, status:from==="me"?"delivered":"read" }],
        preview: text,
        time: "Now",
      };
    }));
  };

  const activeConv = conversations.find(c => c.id===activeId);

  return (
    <div style={{ position:"fixed", inset:0, width:"100%", height:"100%", fontFamily:sf, background:T.bg, overflow:"hidden" }}>
      <AnimatePresence mode="wait">
        {activeConv ? (
          <motion.div key={`chat-${activeConv.id}`}
            initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
            transition={{ type:"spring", stiffness:360, damping:36, mass:0.9 }}
            style={{ position:"absolute", inset:0 }}
          >
            <ChatView conversation={activeConv} onBack={() => setActiveId(null)} onSendMessage={handleSendMessage} />
          </motion.div>
        ) : (
          <motion.div key="list"
            initial={{ x:"-30%" }} animate={{ x:0 }} exit={{ x:"-30%" }}
            transition={{ type:"spring", stiffness:360, damping:36, mass:0.9 }}
            style={{ position:"absolute", inset:0 }}
          >
            <ConversationList conversations={conversations} onSelect={handleSelect} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
