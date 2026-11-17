/* =========================================================
   MISSION LOG — interactions
   GSAP + ScrollTrigger + Lenis are optional enhancements:
   everything degrades to plain CSS/IntersectionObserver.
   ========================================================= */
(function(){
  'use strict';
  window.__missionOK = true;

  var doc = document, root = doc.documentElement;
  function $(s, c){ return (c || doc).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(k, v){
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch(e){ return null; }
  }
  function sstore(k, v){
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch(e){ return null; }
  }
  function mq(q){ return window.matchMedia ? window.matchMedia(q) : {matches:false}; }
  function onMQ(m, fn){ if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }

  /* ---------- capability / performance tier ---------- */
  var RM = mq('(prefers-reduced-motion: reduce)').matches;
  var FINE = mq('(hover: hover) and (pointer: fine)').matches;
  var conn = navigator.connection || {};
  var LOW = !!(conn.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  var pref = store('mission-fx');
  var LITE = pref ? pref === 'lite' : (RM || LOW);
  root.classList.toggle('lite', LITE);

  var G = window.gsap || null, STg = window.ScrollTrigger || null;
  if (G && STg) G.registerPlugin(STg);

  /* =========================================================
     DICTIONARIES
     ========================================================= */
  var LANG_ATTR = {ko:'ko', en:'en', zh:'zh-Hans'};
  var D = {
    ko: {'ui.copied':'복사됨'},
    en: {
      'hero.lede': `Korean, English, Chinese — one seamless conversation on the show floor.`,
      'intro.quote': `On the show floor, at the negotiating table, in the clinic, at the concert venue — and in the field.`,
      'intro.p1': `I'm a trilingual interpreter with <strong>native-level</strong> Korean, English and Chinese. The Chinese I built during my school years in Suzhou goes beyond everyday conversation to <strong>reading Classical Chinese</strong>, and as a Finance major at Singapore Management University I'm also fluent in <strong>the language of business</strong>.`,
      'intro.p2': `Booth interpreting at Seafood Expo Asia, IDEM and FHA in Singapore, network and operations interpreting on site at a PLAVE concert, Korean–English interpreting for the Press Arbitration Commission's expert interviews at NTU, technical interpreting for global banking projects at LG CNS, medical interpreting at a dermatology clinic, and serving as an interpreter in ROK–US combined exercises — I've delivered <strong>real-time interpretation</strong> across a wide range of settings.`,
      'stat.1': `Working languages`,
      'stat.2': `On-site interpreting jobs, Singapore 2026`,
      'stat.3': `Clients a day in medical interpreting`,
      'stat.4': `Soldiers led as squad leader`,
      'work.title': `Proven in the room.`,
      'w0.role': `On-site Concert Interpreter · Network &amp; Operations`,
      'w0.desc': `Working between the Korean production crew and the local promoter and staff, I handled network and operations interpreting in Korean, English and Chinese. Over three days I connected Korean engineers with local IT and operations teams in real time — through technical discussions and on-site coordination — and in a live-show environment where issues move fast, I focused on conveying each side's intent accurately and neutrally.`,
      'w8.role': `Research Interview Interpreter (Korean–English consecutive) · Press Arbitration Commission field study`,
      'w8.desc': `Accompanying the Korean Press Arbitration Commission on its field study in Singapore, I provided Korean–English consecutive interpreting for two expert interviews with NTU communication faculty. I built a glossary of press-dispute terms — conciliation, arbitration, corrections — in advance from the Commission's English materials and the questionnaires, and accurately conveyed policy and academic discussion on how press grievances are handled in Singapore, the limits of corrections as content spreads across platforms, POFMA, and the new issues AI raises in news production.`,
      'w1.role': `Booth Interpreter (Chinese) · Hae Cheong Jeong, Korea Pavilion`,
      'w1.desc': `Placed by exhibition agency Hypers, I was the dedicated Chinese interpreter for Hae Cheong Jeong (HAECHOMIIN) in the Korea Pavilion. After mastering its range of ready-to-eat, low-calorie noodles — seaweed, tofu, kelp and black bean — and their selling points (gluten-free and vegan certified, free from four common additives, shelf-stable), I interpreted product introductions and consultations for Chinese-speaking buyers over three days and kept the export consultation log.`,
      'w2.role': `Booth Interpreter · Sinpyeong Brewery`,
      'w2.desc': `Supporting a traditional Korean liquor brand's overseas expansion, I interpreted in English and Chinese — from product introductions to substantive business meetings with local distributors. Beyond relaying words, I focused on building trust with Chinese-speaking buyers, and helped keep consultation logs so the team retained the full negotiation context after every meeting.`,
      'w3.role': `Booth Interpreter · innoDtech`,
      'w3.desc': `At a Korean dental-AI startup's booth, I provided Korean–English interpretation for local and international buyers and visitors across three days — and switched straight into Chinese for Chinese-speaking clients and partners, so no conversation hit a language barrier. I studied dental-device terminology in advance to sharpen every product explanation, and recorded each consultation in full to enable follow-up.`,
      'w4.role': `Client Engagement Intern · Business &amp; Technical Interpreting`,
      'w4.desc': `I interpreted on IT and cloud-architecture projects for global banking clients across APAC. In technical meetings where domain knowledge and precise terminology are non-negotiable, I learned to convey complex technical discussions accurately in real time — high-stakes business and technical interpreting of a different order from the expo floor.`,
      'w5.role': `Korean–Chinese Medical Interpreter · Working directly with physicians`,
      'w5.desc': `At a dermatology clinic, I interpreted Korean–Chinese in real time between the director, medical staff and Chinese-speaking clients. Across injectables (Botox, fillers, skin boosters), lifting and laser devices (Ulthera, Tenthera, Thermage) and IV drips (nutrient and whitening), I covered every stage — consultation, in-procedure guidance and aftercare — for around 30 clients a day, taking particular care with treatment areas, dosages and side effects, where a mistranslation becomes a safety issue.`,
      'w6.org': `Republic of Korea Army`,
      'w6.role': `K1A2 Tank Gunner · Interpreter · Squad Leader`,
      'w6.role2': `ROK–US Combined Operations Interpreter · 1 yr 7 mo`,
      'w6.desc': `Throughout my service, I interpreted operational briefings and field communication with U.S. forces during ROK–US combined exercises — building the ability to interpret under intense pressure, where errors are not an option. At the same time, I led a 15-member squad as squad leader and completed my full term of service. A record that proves both interpreting skill and leadership.`,
      'lang.title': `Three languages. One voice.`,
      'lang.ko': `Mother tongue`,
      'lang.en': `International school · IB Diploma`,
      'lang.zh': `Reads Classical Chinese · HSK Level 6`,
      'bg.title': `Education, and beyond.`,
      'bg.exp': `(expected)`,
      'bg.smu': `Business — concentrations in Finance &amp; International Trade`,
      'bg.ssis': `Suzhou, China — the school years that built my trilingual foundation`,
      'bg.shilla': `Cosmetics Sales Intern — served international customers in Chinese and English, contributing to sales`,
      'svc.title': `What I can do for you.`,
      'svc.1t': `Booth visitor engagement`,
      'svc.1d': `Greeting visitors and presenting products in Korean, English and Chinese`,
      'svc.2t': `Buyer meeting interpreting`,
      'svc.2d': `Consecutive interpreting for business meetings with distributors and investors`,
      'svc.3t': `Export consultation logs`,
      'svc.3d': `Recording every consultation and supporting follow-up — hands-on at Seafood Expo, IDEM and FHA`,
      'svc.4t': `Pre-event product briefing`,
      'svc.4d': `Studying domain terminology in advance — medical devices, F&amp;B, IT and more`,
      'svc.5t': `Medical interpreting`,
      'svc.5d': `Korean–Chinese interpreting from consultation through procedure and aftercare — hands-on at IH Clinic`,
      'svc.6t': `Business &amp; technical interpreting`,
      'svc.6d': `Meeting interpretation for IT, cloud and finance — hands-on at LG CNS`,
      'svc.7t': `Concert &amp; large-event operations interpreting`,
      'svc.7d': `Network and operations interpreting between production crews and local staff — hands-on at a PLAVE concert`,
      'svc.8t': `Academic &amp; policy interview interpreting`,
      'svc.8d': `Korean–English consecutive interpreting for expert interviews with faculty and researchers — hands-on for the Press Arbitration Commission at NTU`,
      'svc.avail': `Based in Singapore · On-site at SECC, MBS and Singapore EXPO`,
      'contact.title': `Let's work together.`,
      'contact.text': `For expo and event interpreting, reach out anytime. I'm based in Singapore, ready to join on short notice, and I reply fast.`,
      'ui.copy': `Copy`,
      'ui.copied': `Copied`
    },
    zh: {
      'hero.lede': `韩·英·中三语，让现场沟通畅通无阻。`,
      'intro.quote': `从展会现场到谈判桌，从诊室到演唱会现场，再到实战演训场。`,
      'intro.p1': `精通韩语、英语、中文，三语均达<strong>母语水平</strong>。中学时代在苏州度过，中文能力不止于日常交流，更能<strong>阅读文言文</strong>；目前就读于新加坡管理大学（SMU）金融专业，同时深入掌握<strong>商务场景的语言</strong>。`,
      'intro.p2': `曾在新加坡 Seafood Expo Asia、IDEM、FHA 等国际展会担任展位口译，在 PLAVE 演唱会现场担任网络及运营口译，为韩国言论仲裁委员会在 NTU 的专家访谈提供韩英口译，为 LG CNS 全球银行项目提供技术口译，在皮肤科诊所担任医疗口译，并在韩美联合演训中担任翻译兵——在各类现场完成<strong>实时口译</strong>。`,
      'stat.1': `工作语言`,
      'stat.2': `2026 新加坡现场口译`,
      'stat.3': `医疗口译日均接待顾客`,
      'stat.4': `担任班长带领的士兵`,
      'work.title': `现场，就是证明。`,
      'w0.role': `演唱会现场口译员 · 网络及运营`,
      'w0.desc': `在韩国制作团队与当地主办方及工作人员之间，以韩语、英语、中文担任网络及运营口译。三天内实时衔接韩国工程师与当地 IT 及运营人员的技术协商和现场运营沟通；在问题瞬息万变的演出环境中，专注于中立、准确地传达双方意图。`,
      'w8.role': `研究访谈口译（韩英交替传译）· 韩国言论仲裁委员会海外调研`,
      'w8.desc': `随同韩国言论仲裁委员会赴新加坡实地调研，为与 NTU 传播学院教授团队的两场专家访谈提供韩英交替传译。事先依据委员会英文资料及访谈提纲整理调解、仲裁、更正报道等新闻纠纷术语，准确传达了新加坡新闻侵害救济方式、跨平台传播下更正报道的局限、POFMA，以及 AI 参与新闻生产带来的新议题等政策与学术讨论。`,
      'w1.role': `展会口译员（中文）· Hae Cheong Jeong 展位，韩国馆`,
      'w1.desc': `经展会代理公司 Hypers 派遣，全程负责韩国馆参展商 Hae Cheong Jeong（HAECHOMIIN）展位的中文口译。事先熟悉海藻面、豆腐面、海带面、黑豆面等即食低卡健康面系列的产品特点（无麸质及纯素认证、四无添加、常温保存），在三天展期内为华语买家提供产品介绍及洽谈口译，并撰写出口洽谈记录。`,
      'w2.role': `展会口译员 · Sinpyeong Brewery（韩国传统酒）`,
      'w2.desc': `协助韩国传统酒品牌开拓海外市场，从产品介绍到与当地经销商的实质性商务会谈，全程以英语和中文口译。不止于语言传递，更注重在与华人买家的洽谈中建立信任；并协助撰写洽谈记录，让负责人在会后也能准确把握谈判脉络。`,
      'w3.role': `展会口译员 · innoDtech`,
      'w3.desc': `担任韩国牙科 AI 初创企业展位口译，三天内为到访的国内外买家及观众提供韩英口译；面对华人客户及合作伙伴时，则直接以中文沟通，实现零障碍交流。事先熟悉牙科医疗器械专业术语，提升产品讲解的准确度，并完整记录洽谈内容，为后续跟进提供支持。`,
      'w4.role': `Client Engagement Intern · 商务·技术口译`,
      'w4.desc': `在面向亚太地区全球银行客户的 IT 及云架构项目中担任口译。技术会议对领域知识与术语准确度要求极高，我在此练就了实时、准确传达复杂技术讨论的能力——这是与展会口译截然不同的高难度商务·技术口译经验。`,
      'w5.role': `韩中医疗口译 · 直接为院长及医疗团队口译`,
      'w5.desc': `在皮肤科专科诊所，为院长、医疗团队与华语顾客提供实时韩中医疗口译。涵盖肉毒素、玻尿酸、水光等注射项目，超声刀、Tenthera、热玛吉等提拉及激光仪器项目，以及营养针、美白针等输液项目，从咨询、术中指导到术后注意事项全程口译，日均接待约 30 位顾客。对于施术部位、剂量、副作用等一旦误译便关乎安全的医疗术语，力求精准传达。`,
      'w6.org': `大韩民国陆军`,
      'w6.role': `K1A2 坦克炮手 · 翻译兵 · 班长`,
      'w6.role2': `韩美联合作战口译 · 1年7个月`,
      'w6.desc': `服役期间，在韩美联合演训中为与美军的作战简报及现场沟通担任口译，在高压实战环境中锤炼出不容误译的口译能力。同时作为班长带领 15 人班组，服满兵役光荣退伍。这段经历同时证明了口译实务能力与领导力。`,
      'lang.title': `三种语言，一个声音。`,
      'lang.ko': `母语`,
      'lang.en': `国际学校 · IB 文凭`,
      'lang.zh': `可阅读文言文 · HSK 六级`,
      'bg.title': `求学，与更多经历。`,
      'bg.exp': `（预计）`,
      'bg.smu': `商科 — 金融及国际贸易方向`,
      'bg.ssis': `位于中国苏州——奠定三语能力的中学时代`,
      'bg.shilla': `化妆品销售实习生——以中英文接待海外顾客，助力销售业绩`,
      'svc.title': `我能为您做的。`,
      'svc.1t': `展位访客接待`,
      'svc.1d': `以韩、英、中三语接待观众并讲解产品`,
      'svc.2t': `买家洽谈口译`,
      'svc.2d': `为与经销商、投资人的商务会谈提供交替传译`,
      'svc.3t': `出口洽谈记录`,
      'svc.3d': `记录洽谈内容并支持后续跟进——Seafood Expo、IDEM、FHA 现场实务经验`,
      'svc.4t': `展前产品培训`,
      'svc.4d': `提前学习医疗器械、食品饮料、IT 等领域专业术语`,
      'svc.5t': `医疗口译`,
      'svc.5d': `从咨询、施术到术后护理的韩中医疗口译——IH Clinic 实务经验`,
      'svc.6t': `商务·技术口译`,
      'svc.6d': `IT、云计算、金融等专业领域会议口译——LG CNS 实务经验`,
      'svc.7t': `演唱会·大型活动运营口译`,
      'svc.7d': `制作团队与当地工作人员之间的网络及运营沟通口译——PLAVE 演唱会实务经验`,
      'svc.8t': `学术·政策访谈口译`,
      'svc.8d': `面向教授及研究人员的专家访谈韩英交替传译——韩国言论仲裁委员会 NTU 访谈实务经验`,
      'svc.avail': `常驻新加坡 · 可前往 SECC / MBS / Singapore EXPO 全区域`,
      'contact.title': `期待与您合作。`,
      'contact.text': `展会及活动口译咨询，欢迎随时联系。本人常驻新加坡，可即时到岗，并会尽快回复。`,
      'ui.copy': `复制`,
      'ui.copied': `已复制`
    }
  };

  // UI chrome (new labels for this concept)
  var U = {
    ko: {
      'nav.select':'캐릭터','nav.quests':'퀘스트','nav.ach':'업적','nav.skills':'스킬','nav.contact':'연락',
      'sel.kicker':'언어를 선택하세요','sel.selected':'선택됨','sel.prof':'숙련도','sel.quests':'퀘스트',
      'sel.hint':'카드를 고르면 사이트 언어가 바뀝니다','sel.start':'미션 시작','sel.hire':'통역 의뢰',
      'brief.kicker':'미션 브리핑','q.kicker':'경력','q.cleared':'클리어','q.all':'전체','q.tri':'3개 언어',
      'q.expand':'전체 펼치기','q.collapse':'전체 접기','q.reward':'보상',
      'ach.title':'업적','ach.unlockedN':'해금','ach.note':'퀘스트를 열어 클리어하면 업적이 해금됩니다.',
      'ach.unlocked':'업적 해금','skills.kicker':'서비스','contact.kicker':'연락처',
      'lvup':'레벨 업','egg.title':'치트 코드 승인 — 경험치 MAX','copied':'클립보드에 복사됨'
    },
    en: {
      'nav.select':'Character','nav.quests':'Quests','nav.ach':'Achievements','nav.skills':'Skills','nav.contact':'Contact',
      'sel.kicker':'Select your language','sel.selected':'Selected','sel.prof':'Level','sel.quests':'Quests',
      'sel.hint':'Pick a card to switch the site language','sel.start':'Start mission','sel.hire':'Book interpreter',
      'brief.kicker':'Mission briefing','q.kicker':'Experience','q.cleared':'Cleared','q.all':'All','q.tri':'3 languages',
      'q.expand':'Expand all','q.collapse':'Collapse all','q.reward':'Reward',
      'ach.title':'Achievements','ach.unlockedN':'Unlocked','ach.note':'Open a quest to clear it and unlock its achievement.',
      'ach.unlocked':'Achievement unlocked','skills.kicker':'Services','contact.kicker':'Contact',
      'lvup':'Level up','egg.title':'Cheat code accepted — EXP MAX','copied':'Copied to clipboard'
    },
    zh: {
      'nav.select':'角色','nav.quests':'任务','nav.ach':'成就','nav.skills':'技能','nav.contact':'联系',
      'sel.kicker':'选择语言','sel.selected':'已选择','sel.prof':'熟练度','sel.quests':'任务',
      'sel.hint':'选择卡片即可切换网站语言','sel.start':'开始任务','sel.hire':'预约口译',
      'brief.kicker':'任务简报','q.kicker':'经历','q.cleared':'已通关','q.all':'全部','q.tri':'三语',
      'q.expand':'全部展开','q.collapse':'全部收起','q.reward':'奖励',
      'ach.title':'成就','ach.unlockedN':'已解锁','ach.note':'展开任务即可通关并解锁成就。',
      'ach.unlocked':'成就解锁','skills.kicker':'服务','contact.kicker':'联系方式',
      'lvup':'升级','egg.title':'秘籍已激活 — 经验值 MAX','copied':'已复制到剪贴板'
    }
  };

  var ACH = [
    {id:'tri',     g:'三', ko:['트리플 캐스트','3개 언어 동시 사용 — PLAVE 공연 현장'], en:['Triple Cast','Three languages at once — PLAVE live production'], zh:['三语齐发','三种语言同时运用——PLAVE 演出现场']},
    {id:'policy',  g:'仲', ko:['정책 인터뷰','NTU 전문가 인터뷰 2건 · 한-영 순차'], en:['Policy Interview','Two NTU expert interviews · KO–EN consecutive'], zh:['政策访谈','NTU 专家访谈两场 · 韩英交传']},
    {id:'zhdesk',  g:'海', ko:['중국어 전담','중국어권 바이어 3일 전담 — Seafood Expo Asia'], en:['Chinese Desk','Three days with Chinese-speaking buyers — Seafood Expo Asia'], zh:['中文专席','三天专责华语买家——Seafood Expo Asia']},
    {id:'deal',    g:'酒', ko:['바이어 미팅','현지 디스트리뷰터 비즈니스 미팅 — FHA'], en:['Deal Room','Business meetings with local distributors — FHA'], zh:['商务洽谈','与当地经销商的商务会谈——FHA']},
    {id:'medtech', g:'齒', ko:['치과 AI 용어','치과의료기기 전문 용어 사전 숙지 — IDEM'], en:['Medtech Glossary','Dental-device terminology, studied in advance — IDEM'], zh:['牙科术语','事先熟悉牙科医疗器械术语——IDEM']},
    {id:'tech',    g:'金', ko:['기술 통역','IT·클라우드 아키텍처 미팅 — LG CNS'], en:['Tech Interpreter','IT & cloud-architecture meetings — LG CNS'], zh:['技术口译','IT 及云架构会议——LG CNS']},
    {id:'med',     g:'醫', ko:['의료 통역','하루 약 30명 응대 — IH Clinic'], en:['Medical Interpreter','Around 30 clients a day — IH Clinic'], zh:['医疗口译','日均接待约 30 位顾客——IH Clinic']},
    {id:'field',   g:'軍', ko:['실전 통역','한미 연합훈련 · 15명 분대장'], en:['Under Pressure','ROK–US exercises · led a 15-member squad'], zh:['实战口译','韩美联合演训 · 带领 15 人班组']},
    {id:'polyglot',g:'譯', ko:['폴리글롯','KOR · ENG · 中文 모두 선택'], en:['Polyglot','Switched through KOR, ENG and 中文'], zh:['多语切换','韩·英·中全部切换一遍']},
    {id:'full',    g:'★', ko:['풀 로그','퀘스트 8개 모두 클리어'], en:['Full Log','All 8 quests cleared'], zh:['全部通关','8 个任务全部完成']},
    {id:'invite',  g:'✉', ko:['파티 초대','연락처 복사 또는 메일 열기'], en:['Party Invite','Copied a contact or opened email'], zh:['组队邀请','复制联系方式或打开邮件']},
    {id:'secret',  g:'?', secret:true, ko:['通譯 모드','숨겨진 커맨드 입력'], en:['通譯 Mode','Entered the hidden command'], zh:['通譯模式','输入了隐藏指令']}
  ];
  var ACHMAP = {}; ACH.forEach(function(a){ ACHMAP[a.id] = a; });

  /* =========================================================
     SOUND (WebAudio synth, off by default)
     ========================================================= */
  var AC = null, master = null, sfxOn = false, lastTick = 0;
  function tone(f, at, dur, type, vol){
    var t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function sfx(n){
    if (!sfxOn || !AC) return;
    try {
      switch(n){
        case 'tick': var now = performance.now(); if (now - lastTick < 60) return; lastTick = now; tone(2100, 0, .03, 'square', .025); break;
        case 'select': tone(660, 0, .09, 'triangle', .14); tone(990, .07, .14, 'triangle', .12); break;
        case 'open': tone(420, 0, .07, 'sine', .12); tone(630, .05, .1, 'sine', .1); break;
        case 'clear': [523, 659, 784, 1047].forEach(function(f, i){ tone(f, i * .08, i === 3 ? .45 : .12, 'triangle', .13); }); break;
        case 'ach': tone(988, 0, .16, 'sine', .12); tone(1319, .12, .4, 'sine', .11); break;
        case 'lvup': [392, 523, 659, 784].forEach(function(f, i){ tone(f, i * .05, .09, 'square', .045); }); break;
        case 'egg': for (var i = 0; i < 12; i++) tone(330 * Math.pow(2, i / 6), i * .045, .1, 'square', .05); break;
        case 'copy': tone(1200, 0, .06, 'sine', .1); break;
      }
    } catch(e){}
  }
  var sfxBtn = $('#sfxBtn');
  sfxBtn.addEventListener('click', function(){
    if (!AC){
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = new Ctx(); master = AC.createGain(); master.gain.value = .6; master.connect(AC.destination);
    }
    sfxOn = !sfxOn;
    sfxBtn.setAttribute('aria-pressed', String(sfxOn));
    if (sfxOn){ if (AC.state === 'suspended') AC.resume(); sfx('select'); }
  });

  /* =========================================================
     I18N + DECODE
     ========================================================= */
  var i18nEls = $$('[data-i18n]');
  i18nEls.forEach(function(el){
    var k = el.getAttribute('data-i18n');
    if (!(k in D.ko)) D.ko[k] = el.innerHTML.replace(/\s+/g, ' ').trim();
  });
  var POOL = {
    ko:'가각간감강개거건검게격결경고공과관광교구국군권귀규그극근금기길나난남내녀년노농누능다단달담당대덕도독동두등라람랑래량려력련령로론료루류률리림마만말망매면명모목무문물미민밀바박반발방배백번범법변별병보복본봉부북분불비빈사산상새색생서석선설성세소속손송수숙순술시식신실심아악안암압양어언업여역연열영예오온완왕외요용우운원월위유육윤은음의이인일임입자작장재저적전절점정제조족존종주준중증지직진질집차착찬참창채책처천철청체초촌총최추축출충취치친침타탁탄태택토통투특파판패편평포표품풍피필하학한할함합항해행향허현형호화확환활황회효후훈휘휴흥희',
    en:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    zh:'的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很业最间新什打便位因重被走电四第门相次东政海口使教西再平真听世气信北少关并内加化由却代军产入先山五太水万市眼体别处总才场师书比住员九笑性通目华报立马命张活难神数件安表原车白应路期叫死常提感金何更反合放做系计或司利受光王果亲界及今京务制解各任至清物台象记边共风战干接它许'
  };
  var KEEP = /[\s.,，。、·•—–\-()（）:;!?'"“”‘’&\/+~《》「」→⇄|]/;
  function rnd(p){ return p.charAt((Math.random() * p.length) | 0); }
  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  var scratch = doc.createElement('div');
  function textOf(html){ scratch.innerHTML = html; return scratch.textContent.replace(/\s+/g, ' ').trim(); }
  function inView(el){ var r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40 && r.height > 0; }
  function scramble(text, from, to, pool){
    var s = '';
    for (var i = from; i < to; i++){ var c = text.charAt(i); s += KEEP.test(c) ? c : rnd(pool); }
    return s;
  }
  function decode(el, html, lang, o){
    o = o || {};
    if (el._raf) cancelAnimationFrame(el._raf);
    if (LITE || (!o.force && !inView(el))){ el.innerHTML = html; return; }
    var text = textOf(html), N = text.length, pool = POOL[lang] || POOL.en;
    var mode = o.mode || 'caption', W = o.win || 10;
    var dur = o.dur || Math.min(1000, Math.max(380, N * 8));
    var t0 = performance.now() + (o.delay || 0), f = 0;
    function step(now){
      var p = Math.max(0, Math.min(1, (now - t0) / dur));
      if (p < 1 && (f++ % 2)){ el._raf = requestAnimationFrame(step); return; }
      var out;
      if (mode === 'full'){
        var d = Math.floor(p * N);
        out = esc(text.slice(0, d)) + '<span class="scr">' + esc(scramble(text, d, N, pool)) + '</span>';
      } else {
        var n = Math.floor(p * (N + W)), done = Math.max(0, Math.min(N, n - W)), end = Math.min(N, n);
        out = esc(text.slice(0, done)) + '<span class="scr">' + esc(scramble(text, done, end, pool)) + '</span><span class="ghost">' + esc(text.slice(end)) + '</span>';
      }
      if (p < 1){ el.innerHTML = out; el._raf = requestAnimationFrame(step); }
      else { el.innerHTML = html; el._raf = 0; }
    }
    el._raf = requestAnimationFrame(step);
  }

  /* =========================================================
     ACHIEVEMENTS (render)
     ========================================================= */
  var achGrid = $('#achGrid'), achCount = $('#achCount'), got = {}, nGot = 0;
  achGrid.innerHTML = ACH.map(function(a){
    return '<li class="ach rv' + (a.secret ? ' secret' : '') + '" data-id="' + a.id + '">' +
      '<span class="ach-ico hanja" aria-hidden="true">' + a.g + '</span>' +
      '<span><span class="ach-t"></span><span class="ach-d"></span></span>' +
      '<span class="ach-lock">LOCKED</span></li>';
  }).join('');
  var achEls = {}; $$('.ach', achGrid).forEach(function(el){ achEls[el.getAttribute('data-id')] = el; });
  function renderAch(){
    ACH.forEach(function(a){
      var el = achEls[a.id], t = a[cur] || a.ko;
      $('.ach-t', el).textContent = t[0];
      $('.ach-d', el).textContent = t[1];
      $('.ach-lock', el).textContent = got[a.id] ? 'UNLOCKED' : 'LOCKED';
    });
    $$('.rw-ach').forEach(function(el){ var a = ACHMAP[el.getAttribute('data-achname')]; if (a) el.textContent = (a[cur] || a.ko)[0]; });
  }

  /* =========================================================
     TOASTS
     ========================================================= */
  var toastsEl = $('#toasts'), tq = [], tBusy = 0, small = mq('(max-width: 860px)');
  function toast(html, cls, dur, ach){ tq.push({h:html, c:cls || '', d:dur || 3200, a:ach}); pump(); }
  function pump(){
    var limit = small.matches ? 1 : 2;
    while (tBusy < limit && tq.length){
      // several achievements waiting: fold them into one summary toast (keeps the screen readable)
      if (tq.length > 1 && tq[0].a && tq[1].a){
        var names = [], g = tq[0].a.g;
        while (tq.length && tq[0].a) names.push((tq.shift().a[cur] || [''])[0]);
        tq.unshift({c:'', d:3000, h:'<span class="t-ico hanja" aria-hidden="true">' + g + '</span><span><span class="t-k">◆ ' + U[cur]['ach.unlocked'] + ' ×' + names.length + '</span><span class="t-t">' + esc(names.join(' · ')) + '</span></span>'});
      }
      var t = tq.shift(), el = doc.createElement('div');
      el.className = 'toast ' + t.c; el.innerHTML = t.h; toastsEl.appendChild(el); tBusy++;
      (function(el, d){
        setTimeout(function(){
          el.classList.add('out');
          setTimeout(function(){ el.remove(); tBusy--; pump(); }, LITE ? 0 : 380);
        }, d);
      })(el, t.d);
    }
  }
  function unlock(id, delay){
    if (got[id] || !ACHMAP[id]) return;
    got[id] = 1; nGot++;
    setTimeout(function(){
      var a = ACHMAP[id], t = a[cur] || a.ko, el = achEls[id];
      el.classList.add('got', 'fresh'); setTimeout(function(){ el.classList.remove('fresh'); }, 1100);
      $('.ach-lock', el).textContent = 'UNLOCKED';
      achCount.textContent = nGot;
      toast('<span class="t-ico hanja" aria-hidden="true">' + a.g + '</span><span><span class="t-k">◆ ' + U[cur]['ach.unlocked'] + '</span><span class="t-t">' + esc(t[0]) + '</span><span class="t-d">' + esc(t[1]) + '</span></span>', '', small.matches ? 2600 : 3200, a);
      sfx('ach');
    }, delay || 0);
  }

  /* =========================================================
     LANGUAGE (HUD switch + character select)
     ========================================================= */
  var cur = 'ko', seen = {};
  var langGroup = $('.langs'), langBtns = $$('.langs button'), chars = $$('.char'), uiEls = $$('[data-ui]');
  var ST = {ko:['말은 달라도,','뜻은 하나로.'], en:['Different words.','One meaning.'], zh:['言语不同，','心意相通。']};
  var stLines = $$('.st-line');

  function setLang(l, animate){
    if (!D[l]) l = 'ko';
    cur = l;
    root.lang = LANG_ATTR[l];
    langGroup.setAttribute('data-active', l);
    langBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    chars.forEach(function(c){ c.setAttribute('aria-pressed', String(c.getAttribute('data-lang') === l)); });
    i18nEls.forEach(function(el){
      var h = D[l][el.getAttribute('data-i18n')];
      if (h == null) return;
      if (animate) decode(el, h, l); else el.innerHTML = h;
    });
    uiEls.forEach(function(el){ var k = el.getAttribute('data-ui'); el.textContent = U[l][k] || U.ko[k] || el.textContent; });
    stLines.forEach(function(ln, i){
      if (animate) decode(ln, esc(ST[l][i]), l, {mode:'full', dur:700 + i * 200, force:true});
      else ln.textContent = ST[l][i];
    });
    renderAch();
    seen[l] = 1;
    if (seen.ko && seen.en && seen.zh) unlock('polyglot', 500);
  }
  function chooseLang(l, srcEl){
    if (l === cur) return;
    setLang(l, true);
    sfx('select');
    store('jin-lang', l);
    try {
      var u = new URL(location.href);
      if (l === 'ko') u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
      history.replaceState(null, '', u);
    } catch(e){}
    var card = $('.char[data-lang="' + l + '"]');
    if (card){
      card.classList.remove('burst'); void card.offsetWidth; card.classList.add('burst');
      if (!LITE && G) G.fromTo($('.char-glyph', card), {scale:1.35}, {scale:1, duration:.7, ease:'back.out(2.2)', clearProps:'transform'});
      if (!LITE && srcEl === card) sparks(card, getComputedStyle(card).getPropertyValue('--c') || '#fff', 14);
    }
  }
  langBtns.forEach(function(b){ b.addEventListener('click', function(){ chooseLang(b.getAttribute('data-lang'), b); }); });
  chars.forEach(function(c, i){
    c.addEventListener('click', function(){ chooseLang(c.getAttribute('data-lang'), c); });
    c.addEventListener('keydown', function(e){
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = chars[(i + d + chars.length) % chars.length];
      n.focus(); n.click();
    });
    c.addEventListener('pointerenter', function(){ sfx('tick'); });
  });
  function initialLang(){
    try { var q = new URLSearchParams(location.search).get('lang'); if (q && D[q]) return q; } catch(e){}
    var s = store('jin-lang'); if (s && D[s]) return s;
    var n = (navigator.language || 'ko').toLowerCase();
    if (n.indexOf('ko') === 0) return 'ko';
    if (n.indexOf('zh') === 0) return 'zh';
    return 'en';
  }

  /* =========================================================
     SPARKS / POPUPS
     ========================================================= */
  function sparks(el, color, n){
    if (LITE) return;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < n; i++){
      var s = doc.createElement('i'); s.className = 'spark';
      s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = color; s.style.boxShadow = '0 0 8px ' + color;
      doc.body.appendChild(s);
      var a = (Math.PI * 2 * i) / n + Math.random() * .5, d = 60 + Math.random() * 90;
      var anim = s.animate([
        {transform:'translate(-50%,-50%) rotate(45deg) scale(1)', opacity:1},
        {transform:'translate(calc(-50% + ' + (Math.cos(a) * d).toFixed(1) + 'px), calc(-50% + ' + (Math.sin(a) * d).toFixed(1) + 'px)) rotate(225deg) scale(.2)', opacity:0}
      ], {duration:700 + Math.random() * 300, easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards'});
      anim.onfinish = (function(s){ return function(){ s.remove(); }; })(s);
    }
  }
  function xpPop(el, txt){
    if (LITE) return;
    var r = el.getBoundingClientRect(), p = doc.createElement('span');
    p.className = 'xp-pop'; p.textContent = txt;
    p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height / 2) + 'px';
    doc.body.appendChild(p);
    var a = p.animate([
      {transform:'translate(-50%,-50%) scale(.6)', opacity:0},
      {transform:'translate(-50%,-90%) scale(1.1)', opacity:1, offset:.25},
      {transform:'translate(-50%,-220%) scale(1)', opacity:0}
    ], {duration:1300, easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards'});
    a.onfinish = function(){ p.remove(); };
  }

  /* =========================================================
     XP / LEVEL
     ========================================================= */
  var XP_MAX = 8000, xpFill = $('#xpFill'), xpGhost = $('#xpGhost'), xpNum = $('#xpNum'), lvNum = $('#lvNum'), lvBtn = $('#lvBtn'), xpFlash = $('#xpFlash');
  var scrollMax = 0, bonus = 0, eggOn = false, shown = 0, level = 1, numRaf = 0;
  function totalXP(){ return eggOn ? XP_MAX : Math.min(XP_MAX, Math.round(scrollMax * 6000) + bonus); }
  function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function renderXP(){
    var t = totalXP(), s = (t / XP_MAX).toFixed(4);
    xpGhost.style.transform = 'scaleX(' + s + ')';
    if (LITE || !G) xpFill.style.transform = 'scaleX(' + s + ')';
    else G.to(xpFill, {scaleX:+s, duration:.6, delay:.12, ease:'power2.out', overwrite:true});
    if (LITE){ shown = t; xpNum.textContent = fmt(t); }
    else if (!numRaf){
      numRaf = requestAnimationFrame(function run(){
        var tt = totalXP(); shown += (tt - shown) * .14; if (Math.abs(tt - shown) < 2) shown = tt;
        xpNum.textContent = fmt(Math.round(shown));
        numRaf = shown === tt ? 0 : requestAnimationFrame(run);
      });
    }
    var L = t >= XP_MAX ? 9 : Math.min(9, 1 + Math.floor(t / 1000));
    lvBtn.classList.toggle('max', t >= XP_MAX);
    lvNum.textContent = t >= XP_MAX ? 'MAX' : ('0' + L).slice(-2);
    if (L > level){
      level = L;
      lvBtn.classList.remove('pop'); void lvBtn.offsetWidth; lvBtn.classList.add('pop');
      xpFlash.textContent = '▲ ' + U[cur]['lvup'] + ' · LV.' + (t >= XP_MAX ? 'MAX' : ('0' + L).slice(-2));
      xpFlash.classList.remove('go'); void xpFlash.offsetWidth; xpFlash.classList.add('go');
      sfx('lvup');
    }
  }
  var scrollTick = false;
  function onScroll(){
    var max = root.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (p > scrollMax + .002 || (p === 1 && scrollMax < 1)){ scrollMax = p; renderXP(); }
    scrollTick = false;
  }
  addEventListener('scroll', function(){ if (!scrollTick){ scrollTick = true; requestAnimationFrame(onScroll); } }, {passive:true});

  /* =========================================================
     QUEST LOG
     ========================================================= */
  var quests = $$('.quest'), heads = quests.map(function(q){ return $('.q-head', q); });
  var desk = mq('(min-width: 1000px)'), active = 0, cleared = {}, nCleared = 0;
  var qCount = $('#qCount'), qMeter = $('#qMeter');
  function isDesk(){ return desk.matches; }
  function syncAria(){
    quests.forEach(function(q, i){
      heads[i].setAttribute('aria-expanded', String(isDesk() ? q.classList.contains('active') : q.classList.contains('open')));
    });
  }
  function enterAnim(q){
    if (LITE) return;
    var b = $('.q-body', q); b.classList.remove('enter'); void b.offsetWidth; b.classList.add('enter');
  }
  function setActive(i, anim){
    active = i;
    quests.forEach(function(q, j){ q.classList.toggle('active', j === i); });
    if (anim) enterAnim(quests[i]);
    syncAria();
  }
  heads.forEach(function(h, i){
    h.addEventListener('click', function(){
      sfx('open');
      if (isDesk()){
        if (active !== i) setActive(i, true);
        // keep the pane in view if the user is far down the list
        var pane = $('.q-body', quests[i]).getBoundingClientRect();
        if (pane.top < 0 || pane.top > innerHeight * .6) scrollToEl($('#qlist'));
      } else {
        var o = quests[i].classList.toggle('open');
        if (o) enterAnim(quests[i]);
        syncAria();
      }
    });
    h.addEventListener('pointerenter', function(){ sfx('tick'); });
  });
  onMQ(desk, function(){ syncAria(); if (STg) STg.refresh(); });

  function clearQuest(i){
    if (cleared[i]) return;
    cleared[i] = 1; nCleared++;
    var q = quests[i], stamp = $('.stamp', q);
    q.classList.add('cleared', 'just', 'scanning');
    setTimeout(function(){ q.classList.remove('just', 'scanning'); }, 1500);
    qCount.textContent = nCleared;
    qMeter.style.transform = 'scaleX(' + (nCleared / 8) + ')';
    sfx('clear');
    setTimeout(function(){
      sparks(stamp, '#7dffb2', 12);
      xpPop(stamp, '+250 EXP');
      bonus += 250; renderXP();
    }, LITE ? 0 : 450);
    unlock(q.getAttribute('data-ach'), LITE ? 200 : 900);
    if (nCleared === quests.length) unlock('full', LITE ? 400 : 1800);
  }
  var clearT = {};
  if ('IntersectionObserver' in window){
    var qIO = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var q = e.target.closest('.quest'), i = +q.getAttribute('data-q');
        clearTimeout(clearT[i]);
        if (e.isIntersecting && e.intersectionRatio >= .45 && !cleared[i]){
          clearT[i] = setTimeout(function(){ clearQuest(i); }, LITE ? 200 : 500);
        }
      });
    }, {threshold:[0, .45, .8]});
    quests.forEach(function(q){ qIO.observe($('.q-media', q)); });
  }

  // filters
  var flts = $$('.flt');
  flts.forEach(function(b){
    b.addEventListener('click', function(){
      var f = b.getAttribute('data-f');
      flts.forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      var vis = [];
      quests.forEach(function(q){
        var L = q.getAttribute('data-langs').split(' ');
        var show = f === 'all' || (f === 'tri' ? L.length === 3 : L.indexOf(f) >= 0);
        q.classList.toggle('is-hidden', !show);
        if (show) vis.push(q);
      });
      if (isDesk() && quests[active].classList.contains('is-hidden') && vis.length) setActive(+vis[0].getAttribute('data-q'), true);
      if (!LITE && G) G.fromTo(vis.map(function(q){ return $('.q-head', q); }), {opacity:0, x:-18}, {opacity:1, x:0, duration:.45, stagger:.05, ease:'power3.out', clearProps:'transform,opacity'});
      sfx('tick');
      if (STg) STg.refresh();
    });
  });

  // expand all (mobile)
  var expBtn = $('#expandAll'), expSpan = $('span', expBtn), expanded = false;
  expBtn.addEventListener('click', function(){
    expanded = !expanded;
    quests.forEach(function(q){ q.classList.toggle('open', expanded); });
    expBtn.setAttribute('aria-pressed', String(expanded));
    expSpan.setAttribute('data-ui', expanded ? 'q.collapse' : 'q.expand');
    expSpan.textContent = U[cur][expanded ? 'q.collapse' : 'q.expand'];
    syncAria(); sfx('open');
    if (STg) setTimeout(function(){ STg.refresh(); }, 550);
  });

  /* =========================================================
     CONTACT
     ========================================================= */
  $$('.copy').forEach(function(btn){
    btn.addEventListener('click', function(){
      var val = btn.getAttribute('data-copy');
      function ok(){
        btn.classList.add('done');
        btn.textContent = D[cur]['ui.copied'];
        clearTimeout(btn._t);
        btn._t = setTimeout(function(){ btn.classList.remove('done'); btn.innerHTML = D[cur]['ui.copy']; }, 1600);
        toast('<span><span class="t-k">✓ ' + U[cur]['copied'] + '</span><span class="t-t">' + esc(val) + '</span></span>', 'info', 1800);
        sfx('copy');
        unlock('invite', 400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(val).then(ok, function(){});
      } else {
        try {
          var ta = doc.createElement('textarea'); ta.value = val; doc.body.appendChild(ta); ta.select();
          doc.execCommand('copy'); doc.body.removeChild(ta); ok();
        } catch(e){}
      }
    });
  });
  $$('a[href^="mailto:"], a[href^="tel:"]').forEach(function(a){ a.addEventListener('click', function(){ unlock('invite', 300); }); });

  /* =========================================================
     NAV ACTIVE STATE
     ========================================================= */
  var navLinks = $$('[data-nav]');
  if ('IntersectionObserver' in window){
    var navIO = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var k = e.target.getAttribute('data-sec');
        navLinks.forEach(function(a){ a.classList.toggle('on', a.getAttribute('data-nav') === k); });
      });
    }, {rootMargin:'-40% 0px -55% 0px'});
    $$('[data-sec]').forEach(function(s){ navIO.observe(s); });
  }

  /* =========================================================
     REVEAL
     ========================================================= */
  var rvEls = $$('.rv');
  function revealAll(){ rvEls.forEach(function(el){ el.classList.add('in'); }); }
  if (LITE || !('IntersectionObserver' in window)) revealAll();
  else {
    var rIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); rIO.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    rvEls.forEach(function(el, i){
      if (el.classList.contains('ach') || el.classList.contains('skill')) el.style.transitionDelay = ((i % 4) * 60) + 'ms';
      rIO.observe(el);
    });
  }

  /* =========================================================
     SMOOTH SCROLL (Lenis) + anchors
     ========================================================= */
  var lenis = null, lenisRaf = null, lenisLoop = 0;
  function hudH(){ return $('#hud').offsetHeight + 12; }
  function scrollToEl(el){
    if (!el) return;
    if (lenis) lenis.scrollTo(el, {offset:-hudH(), duration:1.1});
    else {
      var y = el.getBoundingClientRect().top + scrollY - hudH();
      window.scrollTo({top:Math.max(0, y), behavior:LITE ? 'auto' : 'smooth'});
    }
  }
  function initLenis(){
    if (lenis || LITE || !FINE || !window.Lenis) return;
    try {
      lenis = new window.Lenis({lerp:.12, smoothWheel:true});
      if (G){
        if (STg) lenis.on('scroll', STg.update);
        lenisRaf = function(t){ lenis && lenis.raf(t * 1000); };
        G.ticker.add(lenisRaf); G.ticker.lagSmoothing(0);
      } else {
        (function loop(t){ if (!lenis) return; lenis.raf(t); lenisLoop = requestAnimationFrame(loop); })(performance.now());
      }
    } catch(e){ lenis = null; }
  }
  function killLenis(){
    if (!lenis) return;
    if (G && lenisRaf) G.ticker.remove(lenisRaf);
    cancelAnimationFrame(lenisLoop);
    lenis.destroy(); lenis = null;
  }
  doc.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var t = id.length > 1 ? doc.getElementById(id.slice(1)) : null;
    if (!t) return;
    e.preventDefault();
    if (id === '#select') { if (lenis) lenis.scrollTo(0, {duration:1.1}); else window.scrollTo({top:0, behavior:LITE ? 'auto' : 'smooth'}); }
    else scrollToEl(t);
  });

  /* =========================================================
     BACKGROUND PARTICLES (full mode only)
     ========================================================= */
  var cv = $('#fx'), ctx = cv.getContext && cv.getContext('2d'), parts = [], cvOn = false, cvRaf = 0, W = 0, H = 0, DPR = 1, mx = 0, my = 0;
  function cvResize(){
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function cvBuild(){
    var n = W < 700 ? 22 : 46; parts = [];
    for (var i = 0; i < n; i++) parts.push({x:Math.random() * W, y:Math.random() * H, vx:(Math.random() - .5) * .18, vy:-.08 - Math.random() * .22, s:Math.random() * 1.6 + .6, h:Math.random() < .5 ? 0 : (Math.random() < .5 ? 1 : 2)});
  }
  var COLS = ['95,225,255', '243,194,106', '181,157,255'];
  function cvFrame(){
    if (!cvOn) return;
    if (!doc.hidden){
      ctx.clearRect(0, 0, W, H);
      var ox = (mx - W / 2) * .01, oy = (my - H / 2) * .01, lines = W >= 700;
      for (var i = 0; i < parts.length; i++){
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10){ p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.fillStyle = 'rgba(' + COLS[p.h] + ',.55)';
        ctx.fillRect(p.x + ox * p.s, p.y + oy * p.s, p.s, p.s);
        if (lines) for (var j = i + 1; j < parts.length; j++){
          var q = parts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < 12000){
            ctx.strokeStyle = 'rgba(95,225,255,' + (.09 * (1 - d2 / 12000)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x + ox * p.s, p.y + oy * p.s); ctx.lineTo(q.x + ox * q.s, q.y + oy * q.s); ctx.stroke();
          }
        }
      }
    }
    cvRaf = requestAnimationFrame(cvFrame);
  }
  function startCanvas(){ if (cvOn || !ctx) return; cvOn = true; cvResize(); cvBuild(); cvRaf = requestAnimationFrame(cvFrame); }
  function stopCanvas(){ cvOn = false; cancelAnimationFrame(cvRaf); if (ctx) ctx.clearRect(0, 0, W, H); }
  addEventListener('resize', function(){ if (cvOn){ cvResize(); cvBuild(); } }, {passive:true});
  if (FINE) addEventListener('pointermove', function(e){ mx = e.clientX; my = e.clientY; }, {passive:true});

  /* =========================================================
     CARD TILT (mouse only)
     ========================================================= */
  chars.forEach(function(c){
    c.addEventListener('pointermove', function(e){
      if (LITE || e.pointerType !== 'mouse') return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      c.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      c.style.transform = 'rotateY(' + ((x - .5) * 12).toFixed(2) + 'deg) rotateX(' + ((.5 - y) * 10).toFixed(2) + 'deg) translateY(-4px)';
    });
    c.addEventListener('pointerleave', function(){ c.style.transform = ''; });
  });

  /* =========================================================
     FX MODE TOGGLE
     ========================================================= */
  var fxBtn = $('#fxBtn'), fxState = $('#fxState');
  function setLite(v, persist){
    LITE = v;
    root.classList.toggle('lite', v);
    fxBtn.setAttribute('aria-pressed', String(!v));
    fxState.textContent = v ? 'LITE' : 'FULL';
    if (v){ stopCanvas(); killLenis(); revealAll(); chars.forEach(function(c){ c.style.transform = ''; }); $('.chars').classList.remove('pending'); }
    else { startCanvas(); initLenis(); }
    if (persist) store('mission-fx', v ? 'lite' : 'full');
    if (STg) STg.refresh();
  }
  fxBtn.addEventListener('click', function(){ setLite(!LITE, true); sfx('select'); });

  // runtime fps probe: drop to lite if the device can't keep up
  function fpsProbe(){
    if (LITE || pref) return;
    var frames = 0, t0 = performance.now();
    (function f(now){
      frames++;
      if (now - t0 < 2000) return requestAnimationFrame(f);
      if (frames / ((now - t0) / 1000) < 28 && !doc.hidden) setLite(true, false);
    })(t0);
  }

  /* =========================================================
     EASTER EGG — Konami code (or tap LV 5×)
     ========================================================= */
  var KON = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'], kpos = 0, eggBusy = false;
  addEventListener('keydown', function(e){
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KON[kpos]){ kpos++; if (kpos === KON.length){ kpos = 0; egg(); } }
    else kpos = k === KON[0] ? 1 : 0;
  });
  var taps = 0, tapT = 0;
  lvBtn.addEventListener('click', function(){
    taps++; clearTimeout(tapT); tapT = setTimeout(function(){ taps = 0; }, 1600);
    if (taps >= 5){ taps = 0; egg(); }
  });
  var eggEl = $('#egg'), rainCv = $('#eggRain');
  function egg(){
    if (eggBusy) return; eggBusy = true;
    eggOn = true; root.classList.add('overdrive'); renderXP();
    eggEl.classList.add('on'); sfx('egg');
    unlock('secret', 700);
    var stopRain = LITE ? null : rain();
    setTimeout(function(){ eggEl.classList.remove('on'); if (stopRain) stopRain(); eggBusy = false; }, LITE ? 2200 : 3800);
  }
  function rain(){
    var c = rainCv.getContext('2d'); if (!c) return null;
    var w = rainCv.width = innerWidth, h = rainCv.height = innerHeight, fs = 18, cols = Math.ceil(w / fs), drops = [], on = true;
    var GL = '한영중通譯言語말뜻하나ABCDEFENG中文KOR가나다文字心意相通', CC = ['#5fe1ff', '#b59dff', '#ff6d58', '#f3c26a'];
    for (var i = 0; i < cols; i++) drops.push(Math.random() * -40);
    c.font = '600 ' + fs + 'px "Noto Sans KR","Noto Sans SC",sans-serif';
    (function f(){
      if (!on){ c.clearRect(0, 0, w, h); return; }
      c.fillStyle = 'rgba(6,8,11,.16)'; c.fillRect(0, 0, w, h);
      for (var i = 0; i < cols; i++){
        c.fillStyle = CC[i % 4];
        c.fillText(GL.charAt((Math.random() * GL.length) | 0), i * fs, drops[i] * fs);
        if (drops[i] * fs > h && Math.random() > .96) drops[i] = 0;
        drops[i] += .55;
      }
      requestAnimationFrame(f);
    })();
    return function(){ on = false; };
  }

  /* =========================================================
     HERO INTRO + SCROLL FX
     ========================================================= */
  var charsWrap = $('.chars');
  function countUp(){
    $$('[data-count]').forEach(function(el){
      var n = +el.getAttribute('data-count'), pre = el.getAttribute('data-pre') || '';
      if (LITE){ el.textContent = pre + (n < 10 ? '0' + n : n); return; }
      var t0 = performance.now();
      (function run(now){
        var p = Math.min(1, (now - t0) / 1300), k = 1 - Math.pow(1 - p, 4), v = Math.round(n * k);
        el.textContent = pre + (v < 10 ? '0' + v : v);
        if (p < 1) requestAnimationFrame(run);
      })(t0);
    });
  }
  function intro(){
    if (LITE){ countUp(); return; }
    if (G){
      var tl = G.timeline({defaults:{ease:'power3.out'}});
      tl.from('.hero-top', {opacity:0, y:-10, duration:.5})
        .from('.st-line', {opacity:0, yPercent:60, duration:.8, stagger:.12}, '<.05')
        .from('.op', {opacity:0, x:-34, duration:.8}, '<.15')
        .from('.char', {opacity:0, y:60, rotationX:-28, duration:.9, stagger:.1, clearProps:'transform,opacity'}, '<.1')
        .add(function(){ charsWrap.classList.remove('pending'); countUp(); }, '<.4')
        .from('.hero-cta', {opacity:0, y:14, duration:.6}, '<.2');
    } else {
      charsWrap.classList.remove('pending'); countUp();
    }
    if (G && STg){
      G.to('.floor', {yPercent:18, ease:'none', scrollTrigger:{trigger:'#select', start:'top top', end:'bottom top', scrub:true}});
      G.to('.statement', {y:-50, ease:'none', scrollTrigger:{trigger:'#select', start:'top top', end:'bottom top', scrub:true}});
      // quest heads: staggered slide-in as the log scrolls in
      var hs = $$('.q-head');
      G.set(hs, {opacity:0, x:-26});
      STg.batch(hs, {
        start:'top 92%', once:true,
        onEnter:function(b){ G.to(b, {opacity:1, x:0, duration:.55, stagger:.07, ease:'power3.out', clearProps:'transform,opacity'}); }
      });
      // section kicker scan line
      $$('.sec-head .kicker').forEach(function(k){
        G.from(k, {clipPath:'inset(0 100% 0 0)', duration:.9, ease:'power2.out', scrollTrigger:{trigger:k, start:'top 88%', once:true}});
      });
    }
  }

  /* =========================================================
     BOOT
     ========================================================= */
  var boot = $('#boot');
  function startAll(){
    if (!LITE){ startCanvas(); initLenis(); setTimeout(fpsProbe, 400); }
    intro();
    onScroll();
  }
  function runBoot(){
    if (LITE || sstore('mission-booted')){ startAll(); return; }
    sstore('mission-booted', '1');
    boot.classList.add('on');
    var done = false;
    function end(){
      if (done) return; done = true;
      boot.classList.add('out');
      removeEventListener('keydown', end); boot.removeEventListener('click', end);
      setTimeout(function(){ boot.classList.remove('on', 'out'); }, 460);
      startAll();
    }
    addEventListener('keydown', end); boot.addEventListener('click', end);
    setTimeout(end, 1350);
  }

  /* =========================================================
     INIT
     ========================================================= */
  if (!LITE) charsWrap.classList.add('pending');
  fxBtn.setAttribute('aria-pressed', String(!LITE));
  fxState.textContent = LITE ? 'LITE' : 'FULL';
  setLang(initialLang(), false);
  setActive(0, false);
  renderXP();
  runBoot();

  try {
    console.log('%cMISSION LOG%c  hidden command: ↑ ↑ ↓ ↓ ← → ← → B A  (mobile: tap LV ×5)',
      'background:#f3c26a;color:#111;font-weight:700;padding:2px 6px', 'color:#8794a2');
  } catch(e){}
})();
