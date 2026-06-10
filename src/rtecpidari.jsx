import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, Search, Edit, Send, Mic, Plus,
} from "lucide-react";

/* ── Theme ─────────────────────────────────────────────────────── */
const T = {
  bg:         "#000000",
  bgList:     "#000000",
  bgNav:      "#1C1C1E",
  bgInput:    "#000000",
  bgSearch:   "#1C1C1E",
  bgBubbleIn: "#2C2C2E",
  bgBubbleOut:"#34C759",   // green — SMS style like screenshot
  bgAvatar:   "#3A3A5C",   // dark purple-ish like iOS default person avatar
  separator:  "rgba(255,255,255,0.08)",
  textPrim:   "#FFFFFF",
  textSec:    "#8E8E93",
  textBubIn:  "#FFFFFF",
  textBubOut: "#FFFFFF",
  tint:       "#1B84FF",
  unreadDot:  "#1B84FF",
};

const sessionCodes = {};

function fmt2(n) { return String(n).padStart(2, "0"); }
function formatDateTime(date) {
  const data = `${fmt2(date.getDate())}.${fmt2(date.getMonth()+1)}.${date.getFullYear()}`;
  const ora = `${fmt2(date.getHours())}:${fmt2(date.getMinutes())}`;
  return { data, ora };
}
function buildReply(convId, userText) {
  if (!sessionCodes[convId]) {
    sessionCodes[convId] = { baseCode: Math.floor(1000 + Math.random() * 9000), count: 0 };
  } else {
    sessionCodes[convId].count += 1;
  }
  const code = sessionCodes[convId].baseCode + sessionCodes[convId].count;
  const now = new Date();
  const dt = formatDateTime(now);
  // Return structured object so we can highlight the ticket number
  return {
    type: "ticket",
    userText,
    code: `${userText}${code}`,
    date: dt.data,
    time: dt.ora,
  };
}

const INITIAL_CONVERSATIONS = [
  {
    id:1, name:"7000", preview:"Bilet 21670021", time:"13:53", unread:0,
    messages:[
      { id:1, text:"2167", from:"me", time:"1:53 PM", status:"read" },
      { id:2, text:"Solicitare in curs de procesare.", from:"them", time:"1:53 PM", status:"read" },
      { id:3, msgType:"ticket", ticketData:{ userText:"2167", code:"21670021", date:"10.06.2026", time:"13:53" }, text:"Bilet 21670021", from:"them", time:"1:53 PM", status:"read" },
    ],
  },
  {
    id:2, name:"7001", preview:"Bilet 21670021", time:"13:53", unread:0,
    messages:[
      { id:1, text:"2167", from:"me", time:"1:53 PM", status:"read" },
      { id:2, text:"Solicitare in curs de procesare.", from:"them", time:"1:53 PM", status:"read" },
      { id:3, msgType:"ticket", ticketData:{ userText:"2167", code:"21670021", date:"10.06.2026", time:"13:53" }, text:"Bilet 21670021", from:"them", time:"1:53 PM", status:"read" },
    ],
  },
  {
    id:3, name:"Andrei", preview:"vnature nus", time:"9:38 AM", unread:2,
    messages:[
      { id:1, text:"Rtec trebu sa bage conditionere in trolice", from:"them", time:"9:10 AM", status:"read" },
      { id:2, text:"da uai parca is in parelca", from:"me", time:"9:42 AM", status:"read" },
      { id:3, text:"asta si zic uai, ce de facut?", from:"them", time:"9:53 AM", status:"read" },
      { id:4, text:"aplicatia asta zic ca ii destul", from:"me", time:"9:59 AM", status:"read" },
      { id:4, text:"rtec nu is sanatosi", from:"them", time:"10:01 AM", status:"read" },
     { id:4, text:"vnature nus", from:"me", time:"10:11 AM", status:"read" },
 
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
  {
    id:7, name:"Instagram", preview:"Codul tau Instagram este 392 817.", time:"Lun", unread:1,
    messages:[
      { id:1, text:"Instagram: Cineva a incercat sa se conecteze la contul tau. Daca nu esti tu, schimba parola.", from:"them", time:"Vin 9:14 AM", status:"read" },
      { id:2, text:"Instagram: Codul tau de confirmare este 482 031. Nu il impartasi cu nimeni.", from:"them", time:"Vin 9:15 AM", status:"read" },
      { id:3, text:"Instagram: Codul tau Instagram este 392 817.", from:"them", time:"Lun 11:03 AM", status:"delivered" },
    ],
  },
  {
    id:8, name:"Facebook", preview:"Foloseste 748 291 ca parola ta Facebook.", time:"Lun", unread:0,
    messages:[
      { id:1, text:"Facebook: A fost detectata o autentificare noua din Chisinau, Moldova. Nu esti tu? Securizeaza-ti contul.", from:"them", time:"Joi 4:22 PM", status:"read" },
      { id:2, text:"Facebook: Foloseste 748 291 ca parola ta temporara Facebook. Nu o impartasi cu nimeni.", from:"them", time:"Lun 8:47 AM", status:"read" },
    ],
  },
  {
    id:9, name:"enter.md", preview:"Comanda ta #EN-40812 a fost confirmata.", time:"Mar", unread:2,
    messages:[
      { id:1, text:"enter.md: Comanda ta #EN-40812 a fost plasata cu succes. Total: 1.249 MDL. Livrare: 2-3 zile lucratoare.", from:"them", time:"Mar 10:05 AM", status:"read" },
      { id:2, text:"enter.md: Comanda #EN-40812 este in curs de procesare. Vei fi notificat cand expedierea este confirmata.", from:"them", time:"Mar 10:31 AM", status:"delivered" },
    ],
  },
  {
    id:10, name:"999.md", preview:"Anuntul tau a fost activat.", time:"Mie", unread:0,
    messages:[
      { id:1, text:"999.md: Anuntul tau \"Apartament 2 camere, Botanica\" a fost publicat cu succes. ID: 28834712.", from:"them", time:"Mie 9:00 AM", status:"read" },
      { id:2, text:"999.md: Ai primit 3 mesaje noi pentru anuntul tau. Intra pe 999.md pentru a raspunde.", from:"them", time:"Mie 2:15 PM", status:"read" },
      { id:3, text:"999.md: Anuntul tau a fost activat si este vizibil pentru toti utilizatorii.", from:"them", time:"Mie 2:16 PM", status:"read" },
    ],
  },
  {
    id:11, name:"WhatsApp", preview:"Codul tau WhatsApp: 491-837", time:"Joi", unread:0,
    messages:[
      { id:1, text:"WhatsApp: Codul tau WhatsApp: 491-837. Nu il impartasi cu nimeni. rJbA/XP1K V", from:"them", time:"Joi 7:43 AM", status:"read" },
      { id:2, text:"WhatsApp: Contul tau a fost inregistrat pe un dispozitiv nou. Daca nu esti tu, verifica securitatea contului.", from:"them", time:"Joi 7:44 AM", status:"read" },
    ],
  },
];

const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const slideInTransition = {
  type: "tween",
  ease: "linear",
  duration: 0.00,
};

const slideOutTransition = {
  type: "tween",
  ease: "linear",
  duration: 0.45,
};

/* Person silhouette SVG avatar — exactly like iOS default */
function Avatar({ size = 44 }) {
  const r = size / 2;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(180deg, #4A4A6A 0%, #2C2C4A 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden", position: "relative",
    }}>
      {/* Head */}
      <div style={{
        position: "absolute",
        width: size * 0.38,
        height: size * 0.38,
        borderRadius: "50%",
        background: "rgba(180,180,210,0.85)",
        top: size * 0.18,
        left: "50%",
        transform: "translateX(-50%)",
      }} />
      {/* Body / shoulders */}
      <div style={{
        position: "absolute",
        width: size * 0.72,
        height: size * 0.44,
        borderRadius: `${size * 0.36}px ${size * 0.36}px 0 0`,
        background: "rgba(180,180,210,0.85)",
        bottom: -size * 0.04,
        left: "50%",
        transform: "translateX(-50%)",
      }} />
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

/* Render bubble content — ticket messages get blue underlined number */
function BubbleContent({ msg }) {
  if (msg.msgType === "ticket") {
    const { userText, code, date, time } = msg.ticketData;
    return (
      <span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {"Bilet electronic nr. "}
        <span style={{ color:"#1B84FF", textDecoration:"underline", fontWeight:500 }}>{code}</span>
        {`\n Data ${date} ora ${time}\n Valabil 1 ora\n Pret 7 MDL\n Numar de bord ${userText}`}
      </span>
    );
  }
  return <span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{msg.text}</span>;
}

/* ── Conversation List ─────────────────────────────────────────── */
function ConversationList({ conversations, onSelect, searchQuery, setSearchQuery }) {
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width:"100%", height:"100%", background:T.bgList, display:"flex", flexDirection:"column", fontFamily:sf, overflow:"hidden" }}>

      <div style={{ paddingTop:"env(safe-area-inset-top, 16px)", paddingLeft:16, paddingRight:16, paddingBottom:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 0", fontSize:17, color:T.tint, fontFamily:sf }}>Edit</button>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:8 }}>
          <Edit size={20} strokeWidth={1.8} color={T.tint} />
        </button>
      </div>

      <div style={{ padding:"2px 16px 8px" }}>
        <span style={{ fontSize:34, fontWeight:700, letterSpacing:-0.5, color:T.textPrim }}>Messages</span>
      </div>

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
              <div style={{ position:"relative", flexShrink:0 }}>
                <Avatar size={52} />
                {conv.unread > 0 && (
                  <div style={{ position:"absolute", top:-2, right:-2, background:T.unreadDot, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", border:`2px solid ${T.bgList}` }}>
                    {conv.unread}
                  </div>
                )}
              </div>
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
                <span style={{ fontSize:15, color:T.textSec, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block", textAlign:"left", fontWeight: conv.unread>0 ? 500 : 400 }}>
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
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
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
          const reply = buildReply(conversation.id, text);
          onSendMessage(conversation.id, null, "them", reply);
        }, 1000);
      }, 400);
    }
  };

  const msgs = conversation.messages;

  const grouped = [];
  msgs.forEach((msg, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    const isFirst = !prev || prev.from !== msg.from;
    const isLast  = !next || next.from !== msg.from;
    grouped.push({ ...msg, isFirst, isLast });
  });

  const items = [];
  let lastDateLabel = null;
  grouped.forEach(msg => {
    const t = msg.time || "";
    const label = t.includes("Ieri") ? "Ieri"
      : t.includes("Lun") ? "Luni"
      : t.includes("Mar") ? "Marti"
      : (t.includes("AM") || t.includes("PM")) ? "Text Message • SMS\nToday " + t.split(" ").slice(-2).join(" ")
      : t.split(" ")[0];

    if (label !== lastDateLabel) {
      items.push({ type:"date", label });
      lastDateLabel = label;
    }
    items.push({ type:"msg", ...msg });
  });

  const getStatusLabel = (msg) => {
    if (msg.from !== "me") return null;
    if (msg.status === "read") return "Read";
    if (msg.status === "delivered") return "Delivered";
    return "Sent";
  };

  const hasInput = input.length > 0;

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", background:T.bg, fontFamily:sf, position:"relative" }}>

      {/* Header — compact when keyboard open, expanded otherwise */}
      <div style={{
        flexShrink:0,
        background: inputFocused ? "rgba(28,28,30,0.95)" : "transparent",
        backdropFilter: inputFocused ? "blur(20px)" : "none",
        WebkitBackdropFilter: inputFocused ? "blur(20px)" : "none",
        borderBottom: inputFocused ? `0.5px solid ${T.separator}` : "none",
        paddingTop:"env(safe-area-inset-top, 14px)",
        transition:"all 0.25s ease",
        zIndex:10,
        position: inputFocused ? "relative" : "absolute",
        left:0, right:0, top:0,
      }}>
        {inputFocused ? (
          /* Compact header row when keyboard is open */
          <div style={{ display:"flex", alignItems:"center", padding:"8px 12px", gap:8 }}>
            <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:2, padding:"4px 0" }}>
              <ChevronLeft size={22} strokeWidth={2.4} color="#FFFFFF" />
              <span style={{ fontSize:17, fontWeight:400, color:"#FFFFFF", fontFamily:sf }}>53</span>
            </button>
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
              <span style={{ fontSize:17, fontWeight:600, color:T.textPrim, fontFamily:sf, letterSpacing:-0.2 }}>{conversation.name}</span>
            </div>
            {/* spacer to balance back button */}
            <div style={{ width:44 }} />
          </div>
        ) : (
          /* Expanded floating header when keyboard is closed */
          <div style={{ padding:"6px 0 12px" }}>
            <button onClick={onBack} style={{
              position:"absolute",
              top:"calc(env(safe-area-inset-top, 14px) + 8px)",
              left:12,
              background:"rgba(40,40,40,0.82)",
              backdropFilter:"blur(12px)",
              WebkitBackdropFilter:"blur(12px)",
              border:"none", borderRadius:20,
              display:"flex", alignItems:"center",
              gap:2, padding:"6px 14px 6px 8px",
              cursor:"pointer",
              zIndex:11,
            }}>
              <ChevronLeft size={22} strokeWidth={2.4} color="#FFFFFF" />
              <span style={{ fontSize:17, fontWeight:400, color:"#FFFFFF", fontFamily:sf }}>53</span>
            </button>

            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              paddingTop:8,
            }}>
              <Avatar size={60} />
              <div style={{
                background:"rgba(40,40,40,0.82)",
                backdropFilter:"blur(12px)",
                WebkitBackdropFilter:"blur(12px)",
                borderRadius:16,
                display:"flex", alignItems:"center",
                gap:4, padding:"4px 12px 4px 10px",
              }}>
                <span style={{ fontSize:15, fontWeight:600, color:T.textPrim, fontFamily:sf, letterSpacing:-0.2 }}>
                  {conversation.name}
                </span>
                <ChevronLeft size={11} color={T.textSec} style={{ transform:"rotate(180deg)" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages — fills remaining space and scrolls */}
      <div
        ref={messagesContainerRef}
        style={{
          flex:1,
          overflowY:"auto",
          overflowX:"hidden",
          WebkitOverflowScrolling:"touch",
          padding:"4px 0 8px",
          paddingTop: inputFocused ? "8px" : "calc(env(safe-area-inset-top, 14px) + 112px)",
          minHeight:0,
        }}
      >

        {items.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10, paddingBottom:60 }}>
            <Avatar size={72} />
            <span style={{ fontSize:20, fontWeight:600, color:T.textPrim }}>{conversation.name}</span>
            <span style={{ fontSize:14, color:T.textSec }}>No messages</span>
          </div>
        )}

        {items.map((item, idx) =>
          item.type === "date" ? (
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
                padding: item.isFirst ? "6px 12px 1px" : "1px 12px 1px",
                gap:6,
              }}
            >
              <div style={{ maxWidth:"75%", display:"flex", flexDirection:"column", alignItems: item.from==="me" ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: item.from==="me" ? T.bgBubbleOut : T.bgBubbleIn,
                  color: item.from==="me" ? T.textBubOut : T.textBubIn,
                  borderRadius: item.from==="me"
                    ? (item.isLast ? "20px 20px 5px 20px" : "20px 20px 20px 20px")
                    : (item.isLast ? "20px 20px 20px 5px" : "20px 20px 20px 20px"),
                  padding:"9px 14px",
                  fontSize:17,
                  lineHeight:1.4,
                  textAlign: "left",
                }}>
                  <BubbleContent msg={item} />
                </div>

                {item.isLast && item.from === "me" && (
                  <div style={{ fontSize:12, color:T.textSec, marginTop:3, paddingRight:2, letterSpacing:-0.1 }}>
                    {getStatusLabel(item)}
                  </div>
                )}
              </div>
            </motion.div>
          )
        )}

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

      {/* Input bar */}
      <div style={{
        background:T.bgInput,
        borderTop:`0.5px solid ${T.separator}`,
        padding:"8px 12px",
        paddingBottom:"calc(10px + env(safe-area-inset-bottom, 0px))",
        display:"flex", alignItems:"flex-end", gap:10, flexShrink:0,
      }}>
        <button style={{
          background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%",
          width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0, marginBottom:1,
        }}>
        <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        </button>

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
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Text Message • SMS"
            style={{
              flex:1, border:"none", background:"transparent",
              fontSize:17, color:T.textPrim, outline:"none",
              fontFamily:sf, lineHeight:1.4, minWidth:0,
            }}
          />
        </div>

        <div style={{ width:34, height:34, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {hasInput ? (
            <button onClick={handleSend} style={{
              background:T.tint, border:"none", borderRadius:"50%",
              width:34, height:34, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer",
            }}>
              <Send size={16} color="#fff" strokeWidth={2.2} style={{ transform:"translateX(1px) translateY(-1px)" }} />
            </button>
          ) : (
            <button style={{
              background:"none", border:"none", borderRadius:"50%",
              width:34, height:34, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer",
            }}>
              <Mic size={22} color={T.textSec} strokeWidth={1.8} />
            </button>
          )}
        </div>
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

  const handleSendMessage = (convId, text, from="me", ticketData=null) => {
    const now = new Date();
    const h = now.getHours(), m = String(now.getMinutes()).padStart(2,"0");
    const timeStr = `${h%12||12}:${m} ${h<12?"AM":"PM"}`;
    setConversations(prev => prev.map(c => {
      if (c.id!==convId) return c;
      const newMsg = ticketData
        ? { id:Date.now()+Math.random(), msgType:"ticket", ticketData, text:`Bilet ${ticketData.code}`, from, time:timeStr, status:"read" }
        : { id:Date.now()+Math.random(), text, from, time:timeStr, status:from==="me"?"delivered":"read" };
      return {
        ...c,
        messages:[...c.messages, newMsg],
        preview: newMsg.text,
        time: "Now",
      };
    }));
  };

  const activeConv = conversations.find(c => c.id===activeId);

  return (
    <div style={{ position:"fixed", inset:0, width:"100%", height:"100%", fontFamily:sf, background:T.bg, overflow:"hidden" }}>
      {/* List always rendered underneath */}
      <div style={{ position:"absolute", inset:0 }}>
        <ConversationList conversations={conversations} onSelect={handleSelect} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>

      {/* Chat slides on top */}
      <AnimatePresence>
        {activeConv && (
          <motion.div
            key={`chat-${activeConv.id}`}
            initial={{ x:"100%" }}
            animate={{ x:0 }}
            exit={{ x:"100%" }}
            transition={slideInTransition}
            style={{ position:"absolute", inset:0, willChange:"transform" }}
          >
            <ChatView conversation={activeConv} onBack={() => setActiveId(null)} onSendMessage={handleSendMessage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
