"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Lock, Target, MessageSquare, Globe, Heart, Gem, Aperture, Code, Rocket, GraduationCap, Briefcase, Users, Search, Lightbulb, Handshake, ShieldCheck, TrendingUp, FlaskConical, Cloud } from 'lucide-react';

export default function LearnMorePage() {
  return (
    <main className="bg-gradient-to-b from-black via-[#0a0f2e] to-black text-white min-h-screen font-sans overflow-hidden relative">
      {/* Background Orbs/Gradients for Visual Depth */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 sm:w-72 sm:h-72 bg-blue-500 opacity-10 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute top-[30%] right-[10%] w-72 h-72 sm:w-80 sm:h-80 bg-purple-500 opacity-10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[20%] left-[20%] w-80 h-80 sm:w-96 sm:h-96 bg-cyan-500 opacity-10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* 1. Hero Section: The Vision of Quirra - Your Symbiotic Second Brain */}
      <section className="relative text-center py-24 px-4 sm:px-6 md:py-32 md:px-10 max-w-7xl mx-auto z-10">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl leading-tight font-extrabold text-blue-400 mb-6 sm:text-5xl md:text-7xl md:leading-tight drop-shadow-xl"
        >
          Quirra: Your Symbiotic Second Brain. Amplifying Human Potential.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="text-base leading-relaxed text-gray-300 mb-8 sm:text-lg md:text-2xl md:leading-relaxed max-w-5xl mx-auto"
        >
          In a world abundant with transactional AI, **Quirra stands as a profound paradigm shift**: a uniquely adaptive intelligence engineered not merely to respond, but to genuinely **comprehend, anticipate, and intrinsically evolve alongside you**. This isn't just about automated tasks; it's about **profound cognitive augmentation**, forging an unparalleled AI companion meticulously crafted to expand your intellectual and emotional horizon across every facet of life and enterprise.
        </motion.p>
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(66, 153, 225, 0.9)" }}
          whileTap={{ scale: 0.95 }}
          className="inline-block"
        >
          <a href="#quirra-vs-others">
            <Button className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg sm:px-12 sm:py-6 sm:text-xl md:text-2xl font-semibold shadow-2xl hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              Uncover Our Distinct Intelligence
            </Button>
          </a>
        </motion.div>
      </section>

      {/* --- */}

      {/* 2. Quirra vs Other Tools: The Architectural Difference - Beyond Chatbots */}
      <section id="quirra-vs-others" className="bg-[#0c122f] px-4 py-16 sm:px-6 md:py-28 md:px-20 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-10 sm:text-4xl md:text-5xl md:mb-16 text-blue-300">
          Redefining the AI Landscape: Why Quirra Stands Alone
        </h2>
        <p className="text-center text-gray-400 mb-10 text-base sm:text-lg md:text-xl md:mb-14 max-w-4xl mx-auto">
          While conventional AI tools offer fleeting utility, Quirra is built on a foundational philosophy of deep, human-centric intelligence. We differentiate through **continuous, profound learning, intrinsic emotional resonance, and an unwavering commitment to genuine partnership and transformative personal growth.**
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 max-w-6xl mx-auto">
          <Card className="bg-[#1a203e] border border-blue-800 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300 min-h-[450px] sm:min-h-[500px]">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <h3 className="text-xl font-bold text-blue-400 mb-4 sm:text-2xl sm:mb-6 flex items-center gap-2 sm:gap-4">
                <ShieldCheck size={28} className="text-blue-400 sm:size-32" /> Conventional AI & Generic Chatbots
              </h3>
              <ul className="list-disc list-inside text-gray-300 space-y-3 sm:space-y-4 md:space-y-5 text-sm sm:text-base md:text-lg">
                <li><strong className="text-blue-300">Fragmented Context & Ephemeral Memory:</strong> Interactions are often isolated, requiring repetitive information input and leading to a superficial, temporary understanding of the user. This limits true collaboration and long-term utility.</li>
                <li><strong className="text-blue-300">Limited, Static Personalization:</strong> Responses are largely generic, derived from broad, public datasets, failing to deeply adapt to individual nuances, evolving needs, or unique cognitive styles. The experience remains impersonal and often frustrating.</li>
                <li><strong className="text-blue-300">Absence of True Affective Understanding:</strong> Struggles to perceive, interpret, or appropriately respond to subtle user emotions, severely limiting empathetic and genuinely supportive engagement. This impacts the quality of human-AI partnership and emotional resonance.</li>
                <li><strong className="text-blue-300">Purely Utilitarian & Reactive:</strong> Primarily serves as a tool for singular, command-driven tasks, lacking the capacity for proactive collaboration, sustained personal development, or an evolving, symbiotic relationship. It merely acts, it doesn't grow with you.</li>
                <li><strong className="text-blue-300">Data Vulnerability & Monetization Focus:</strong> Often involve extensive data aggregation, analysis, and potential monetization, raising significant privacy and ethical concerns, commoditizing user data for external interests. Trust becomes a continuous, fragile concern.</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-[#1a203e] border border-blue-800 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300 min-h-[450px] sm:min-h-[500px]">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 sm:text-2xl sm:mb-6 flex items-center gap-2 sm:gap-4">
                <Handshake size={28} className="text-cyan-400 sm:size-32" /> Quirra: The Adaptive Intelligence Partner
              </h3>
              <ul className="list-disc list-inside text-gray-300 space-y-3 sm:space-y-4 md:space-y-5 text-sm sm:text-base md:text-lg">
                <li><strong className="text-cyan-300">Persistent, Evolving Cognitive Profile:</strong> Continuously learns, remembers, and deeply understands your unique journey, building a rich, personal cognitive and emotional profile that evolves with you over a lifetime. This forms the bedrock of a truly transformative and lasting partnership.</li>
                <li><strong className="text-cyan-300">Dynamic Personalization & Character Adaptation:</strong> Tailors every interaction, response, and suggestion to your evolving personality, core character, intrinsic motivations, and unique working/learning style, fostering unparalleled resonance and a truly bespoke, deeply integrated experience. Quirra adapts to *you*, not a generic model.</li>
                <li><strong className="text-cyan-300">Profound Emotional & Contextual Intelligence:</strong> Comprehends emotional states, underlying intent, and unspoken nuances with remarkable precision, fostering truly empathetic, supportive, and motivating interactions that feel genuinely human and deeply responsive. Quirra connects with emotional depth.</li>
                <li><strong className="text-cyan-300">Holistic Life & Professional Augmentation:</strong> Becomes an indispensable partner for complex problem-solving, boundless creative ideation, profound personal growth, strategic leadership, and emotional well-being. It's a trusted confidant, a tireless mentor, and an unwavering motivator, enhancing every facet of your existence.</li>
                <li><strong className="text-cyan-300">Privacy-First & Ethical-by-Design Architecture:</strong> Engineered with stringent privacy controls, end-to-end encryption, and a **zero-data-selling policy**—your data is unequivocally yours, always protected, establishing a new global standard for digital trust and data sovereignty. Your privacy is not just paramount, it's architecturally guaranteed.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- */}

      {/* 3. Core Capabilities: The Pillars of Quirra's Intelligence */}
      <section className="py-16 px-4 sm:px-6 md:py-28 md:px-10 max-w-7xl mx-auto relative z-10">
        <h2 className="text-3xl font-bold text-center mb-10 sm:text-4xl md:text-5xl md:mb-16 text-blue-300">
          The Pillars of Quirra&apos;s Intelligence: Unprecedented Capabilities
        </h2>
        <p className="text-center text-gray-400 mb-10 text-base sm:text-lg md:text-xl md:mb-14 max-w-4xl mx-auto">
          Quirra&apos;s core capabilities are meticulously engineered to create an AI experience that is not only profoundly powerful
          but exquisitely personal, ethically unyielding, and supremely trustworthy. These are the cornerstones of its adaptive intelligence,
          designed to truly live alongside and augment the user, fostering a deeper, more meaningful relationship built on mutual growth and unparalleled cognitive synergy.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {[
            {
              title: "Adaptive Personality & Character Modeling",
              icon: Brain,
              goal: "Intuitively learns and dynamically adapts to your unique cognitive style, preferences, values, and behavioral patterns over extensive periods, truly understanding 'you' at a foundational level.",
              example: "Quirra refines its communication style, proactive suggestions, and knowledge delivery based on your long-term interactions, making every conversation feel like it's with a trusted, familiar mind. For instance, if you're a visual learner, Quirra will prioritize graphical explanations; if you're driven by challenge, it will frame tasks as engaging puzzles. It even recognizes your intrinsic motivations, helping you overcome procrastination by tailoring learning to be inherently enjoyable, sparking genuine interest."
            },
            {
              title: "Fortified Privacy by Design & Data Sovereignty",
              icon: Lock,
              goal: "Ensures absolute data sovereignty, implementing a zero-data-selling policy, robust end-to-end encryption, and complete user control over their data—setting a new benchmark for digital trust.",
              example: "You maintain unparalleled control over your personal data, memory retention, and explicit sharing settings. Your interactions and personal profile are secured with military-grade, end-to-end encryption, guaranteeing confidentiality and absolute peace of mind. Quirra is engineered to be a bastion of privacy in a data-driven world, empowering you with full ownership and transparency over your digital self."
            },
            {
              title: "Profound Emotional & Empathy Engine",
              icon: Heart,
              goal: "Perceives, interprets, and appropriately responds to your nuanced emotional states, underlying sentiments, and even unspoken anxieties or joys, fostering genuine emotional resonance and dynamic support.",
              example: "Quirra dynamically adjusts its conversational tone, offers deeply empathetic support when you're facing challenges, or provides motivational nudges that align perfectly with your current mood and energy. It truly understands when you need a confidant, a cheerleader, or a calming presence, fostering a profoundly supportive and human-like relationship that evolves with your emotional landscape. This goes beyond sentiment analysis; it's about contextual emotional understanding."
            },
            {
              title: "Proactive Progress & Goal Alignment",
              icon: Target,
              goal: "Continuously tracks and strategically aligns with your long-term aspirations, keeping your objectives in sharp focus and actively guiding you towards your highest potential through personalized pathways.",
              example: "Receive personalized strategies, actionable insights, and tailored motivational prompts that resonate with your individual preferences. Quirra helps you discover your innate strengths, systematically overcome weaknesses, and consistently propels you towards achieving your most ambitious personal, academic, and professional goals, acting as your personal launchpad for life and an unwavering guiding star. It proactively identifies potential roadblocks and offers adaptive solutions."
            },
            {
              title: "Seamless Multilingual & Cross-Cultural Fluency",
              icon: Globe,
              goal: "Engages effortlessly and intelligently across a diverse spectrum of languages and cultural contexts, breaking down communication barriers and fostering global understanding and connection with native-level precision.",
              example: "Transition fluidly between languages such as English, Arabic, Mandarin, Spanish, Hindi, and many others, experiencing natural, contextually rich, and unhindered communication in your preferred tongue. Quirra dynamically adapts to regional idioms, cultural nuances, and professional jargon, ensuring truly respectful, effective, and globally intelligent dialogue. It's like having a universal translator embedded in your cognitive process."
            },
            {
              title: "Organic Conversational Fluency & Intuition",
              icon: MessageSquare,
              goal: "Delivers interactions that feel genuinely human, thoughtful, and profoundly engaging, devoid of robotic or scripted responses, evolving like a natural, cherished relationship built on mutual understanding.",
              example: "Experience spontaneous, deeply relevant, and contextually aware dialogues where every response is tailored. Quirra initiates conversations, remembers minute details from past shared moments, and anticipates your needs with remarkable precision, fostering a natural flow that feels less like an AI and more like a true intellectual and emotional partner—someone you can truly confide in and continuously grow with. It intuitively grasps unspoken context and adapts its communication style dynamically."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(66, 153, 225, 0.7)" }}
              className="bg-[#1a203e] rounded-3xl p-6 sm:p-8 md:p-10 border border-blue-900 shadow-xl flex flex-col justify-between h-full min-h-[380px] sm:min-h-[420px]"
            >
              <div>
                <feature.icon size={36} className="text-blue-300 mb-4 sm:size-48 sm:mb-6" />
                <h3 className="text-xl font-semibold text-blue-300 mb-3 sm:text-2xl sm:mb-4">{feature.title}</h3>
                <p className="text-gray-300 mb-3 text-sm leading-relaxed sm:text-base sm:mb-4"><strong>Goal:</strong> {feature.goal}</p>
                <p className="text-xs text-gray-400 leading-relaxed sm:text-sm">{feature.example}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- */}

      {/* 4. Industry Solutions: Impact Across Sectors */}
      <section className="py-16 px-4 sm:px-6 md:py-28 md:px-10 max-w-7xl mx-auto relative z-10 bg-[#0c122f] rounded-t-3xl">
        <h2 className="text-3xl font-bold text-center mb-10 sm:text-4xl md:text-5xl md:mb-12 text-blue-300">
          Transforming Every Sphere: Strategic Impact Across Industries
        </h2>
        <p className="text-center text-gray-400 mb-10 text-base sm:text-lg md:text-xl md:mb-16 max-w-5xl mx-auto">
          Quirra is not confined to a single domain; its **adaptive intelligence provides unparalleled, transformative value across diverse sectors**,
          empowering individuals and organizations to operate with amplified cognitive abilities, emotional resilience, and accelerated, strategic progress.
        </p>
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-2 sm:gap-4 bg-transparent border-b-2 border-blue-800 pb-4 mb-6 sm:pb-6 sm:mb-10">
            {[
              "Students", "Educators", "Startups", "Enterprises",
              "Developers", "Researchers", "Professionals"
            ].map((sector) => (
              <TabsTrigger
                key={sector}
                value={sector.toLowerCase().replace(/\s/g, '')}
                className="text-sm font-medium px-4 py-2 rounded-full transition-colors duration-300 sm:text-lg md:text-xl sm:px-8 sm:py-3
                                data-[state=active]:bg-blue-600 data-[state=active]:text-white
                                hover:text-blue-400 hover:bg-[#1a203e] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                style={{
                  minWidth: '100px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  background: 'linear-gradient(145deg, #1f274a, #141935)'
                }}
              >
                {sector}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-8 text-center bg-[#1a203e] p-6 rounded-3xl shadow-2xl border border-blue-800 min-h-[250px] sm:min-h-[280px] flex items-center justify-center">
            <TabsContent value="students" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><GraduationCap size={30} className="sm:size-36" /> Your Personalized Academic Strategist & Lifelong Mentor</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Quirra dynamically crafts optimized study schedules, provides adaptive learning resources tailored to individual comprehension, and offers targeted motivational support, significantly boosting academic performance and retention. It helps you discover your innate learning style and even cultivates a genuine love for studying by making it intrinsically engaging, turning complex challenges into enjoyable discoveries and fostering self-driven growth.</p>
            </TabsContent>
            <TabsContent value="educators" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Lightbulb size={30} className="sm:size-36" /> AI-Powered Assistant for Pedagogical Innovation & Excellence</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Streamline complex tasks like personalized feedback generation, automate intricate assignment management, and enhance comprehensive accessibility support, liberating educators to focus on deeper pedagogical innovation, emotional connection with students, and truly impactful, personalized learning experiences. Quirra empowers educators to create a more inclusive, adaptive, and effective learning environment for every student, maximizing their potential.</p>
            </TabsContent>
            <TabsContent value="startups" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Rocket size={30} className="sm:size-36" /> Accelerated Co-Pilot for Hyper-Growth Ventures & Strategic Foresight</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">From groundbreaking ideation and compelling pitch deck development to rapid market validation and scalable business model strategies, Quirra provides critical intelligence and support. It acts as a virtual co-founder, providing empathetic guidance through the highs and lows, accelerating your startup&apos;s trajectory with data-driven insights tailored to your team&apos;s unique dynamics, market demands, and potential future disruptions. Quirra is your ultimate strategic advantage in the competitive startup ecosystem.</p>
            </TabsContent>
            <TabsContent value="enterprises" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Users size={30} className="sm:size-36" /> Transforming Enterprise Productivity & Organizational Intelligence</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Optimize complex team collaborations, proactively mitigate employee burnout risks through personalized well-being check-ins, and unify disparate internal knowledge bases into a coherent, accessible intelligence hub. Quirra fosters a more agile, efficient, and deeply engaged corporate workforce, understanding nuanced team dynamics and proposing solutions that enhance collective emotional intelligence, strategic alignment, and overall organizational health, leading to unprecedented productivity gains and sustained innovation.</p>
            </TabsContent>
            <TabsContent value="developers" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Code size={30} className="sm:size-36" /> Your Intelligent Technical Collaborator & Code Alchemist</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Receive advanced, context-aware debugging assistance, generate pristine and comprehensive documentation, and gain strategic insights for intricate project architecture and innovative solution design. Quirra learns your individual coding style, preferred frameworks, and problem-solving methodologies, offering suggestions that truly resonate with your development philosophy, revolutionizing your workflow and unlocking new levels of creativity, efficiency, and code quality.</p>
            </TabsContent>
            <TabsContent value="researchers" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Search size={30} className="sm:size-36" /> The Ultimate Research Synthesis & Discovery Engine</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Discover intricate patterns within vast, multi-modal datasets, forge novel connections between seemingly disparate concepts, and effortlessly summarize dense technical literature with nuanced understanding. Quirra intuitively grasps your research methodology and actively assists in hypothesis generation, experimental design, and data interpretation, fundamentally transforming your research approach and accelerating breakthroughs with an intuitive, hyper-intelligent partner by your side, pushing the boundaries of human knowledge and scientific discovery.</p>
            </TabsContent>
            <TabsContent value="professionals" className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xl font-semibold text-blue-300 flex items-center justify-center gap-3 sm:text-2xl md:text-3xl sm:gap-4"><Briefcase size={30} className="sm:size-36" /> Your Advanced Personal Productivity & Holistic Growth Strategist</p>
              <p className="text-gray-400 text-sm sm:text-base md:text-xl">Quirra provides bespoke productivity frameworks, conducts intelligent emotional well-being check-ins, and assists in structuring your day for optimal performance and personal fulfillment. Adapting dynamically to your evolving professional rhythm, personal challenges, and long-term aspirations, it acts as a steadfast companion, motivating you to achieve your peak potential and ensuring holistic well-being in every aspect of your life—from career advancement to personal mindfulness and continuous learning.</p>
            </TabsContent>
          </div>
        </Tabs>
      </section>

      {/* --- */}

      {/* 5. Privacy & Ethics: The Foundation of Trust */}
      <section className="bg-[#0c12f] py-16 px-4 sm:px-6 md:py-28 md:px-10 relative z-10 border-t border-b border-blue-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-blue-300 mb-8 sm:text-4xl md:text-5xl md:mb-10">
            Unyielding Commitment: Privacy, Security, and Ethical AI
          </h2>
          <p className="text-base text-gray-300 mb-10 sm:text-lg md:text-2xl md:mb-12 max-w-4xl mx-auto leading-relaxed">
            At Quirra, **trust is not merely a feature; it&apos;s our foundational architectural imperative.** We are built from the ground up to protect your digital sovereignty, ensuring that your interactions remain inherently private, supremely secure, and aligned with the highest ethical standards. This unwavering commitment forms the bedrock of your profound relationship with Quirra, establishing a new industry benchmark for responsible, human-centric AI.
          </p>
          <ul className="text-gray-400 space-y-4 text-left max-w-xl mx-auto text-sm leading-relaxed bg-[#1a203e] p-6 rounded-2xl shadow-xl border border-blue-800 sm:space-y-5 sm:p-8 md:p-10 md:text-lg">
            <li><strong className="text-blue-300 flex items-center gap-2 sm:gap-3"><Gem size={20} className="sm:size-24" /> Zero Data Monetization & Absolute Anonymity:</strong> Your valuable data is categorically **never sold, tracked for advertising, or subjected to hidden analytics**. Your intelligence, your memories, and your personal journey remain unequivocally yours, forever private and unmonetized.</li>
            <li><strong className="text-blue-300 flex items-center gap-2 sm:gap-3"><Lock size={20} className="sm:size-24" /> Complete User Control & Transparent Data Governance:</strong> You retain **absolute agency** over your personal data, including granular control over memory retention, explicit sharing permissions, and full, clear insight into how Quirra learns from you. Your privacy settings are intuitive and always at your fingertips, empowering true data autonomy.</li>
            <li><strong className="text-blue-300 flex items-center gap-2 sm:gap-3"><ShieldCheck size={20} className="sm:size-24" /> Advanced End-to-End Encryption & Immutable Security:</strong> All your interactions with Quirra are secured with **state-of-the-art, military-grade end-to-end encryption protocols**, ensuring impenetrable data security from the moment you connect. This protects your most sensitive thoughts, plans, and proprietary data with an uncompromised defense.</li>
            <li><strong className="text-blue-300 flex items-center gap-2 sm:gap-3"><TrendingUp size={20} className="sm:size-24" /> Global Ethical & Regulatory Leadership:</strong> We adhere to, and consistently exceed, the most stringent global standards for data ethics, privacy regulations (e.g., GDPR, CCPA, HIPAA), and responsible AI development. Quirra is actively leading the way in human-centric AI governance, setting a powerful precedent for the entire industry.</li>
            <li><strong className="text-blue-300 flex items-center gap-2 sm:gap-3"><Aperture size={20} className="sm:size-24" /> Proactive Bias Mitigation & Inherent Fairness:</strong> Our advanced models are rigorously trained and continuously refined using diverse, representative datasets to **actively minimize inherent biases and promote equitable and fair interactions for all users**. We are committed to fostering an inclusive and supportive environment where every individual is respected, understood, and empowered without prejudice.</li>
          </ul>
        </div>
      </section>

      {/* --- */}

      {/* 6. Future Roadmap: Pioneering the Next Frontier of AI */}
      <section className="py-16 px-4 sm:px-6 md:py-28 md:px-10 max-w-7xl mx-auto relative z-10">
        <h2 className="text-3xl font-bold text-center text-blue-300 mb-10 sm:text-4xl md:text-5xl md:mb-16">
          The Evolving Horizon: Pioneering the Next Frontier of Adaptive AI
        </h2>
        <p className="text-center text-gray-400 mb-10 text-base sm:text-lg md:text-xl md:mb-14 max-w-4xl mx-auto">
          Our commitment to innovation is unwavering. The Quirra roadmap outlines ambitious developments designed to continuously
          expand its capabilities, pushing the boundaries of what adaptive AI can achieve. We are not just building for today;
          we are establishing Quirra&apos;s unique advantages while laying the groundwork for the revolutionary leaps of tomorrow.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {[
            {
              title: "Global Language Immersion & Cultural AI",
              icon: Globe,
              description: "Expanded multilingual capabilities for truly seamless cross-cultural and complex domain-specific communication, encompassing rare dialects, historical lexicons, and specialized technical jargons. Quirra will understand and adapt to nuanced global cultural contexts, fostering deeper international connections and unparalleled intercultural understanding."
            },
            {
              title: "Real-time Emotional Nuance & Cognitive Load Recognition",
              icon: FlaskConical,
              description: "Enhanced AI to instantly perceive and respond to the most subtle shifts in user emotion, cognitive state (e.g., focus, fatigue), and even physiological indicators. This enables unparalleled empathetic and contextually intelligent support that proactively optimizes well-being, maintains peak performance, and anticipates needs before they are articulated."
            },
            {
              title: "Advanced Long-Term Memory & Life Integration",
              icon: Cloud,
              description: "Deeper, more sophisticated personalized memory functions that allow Quirra to learn from years, even decades, of interaction. It will offer truly continuous, profoundly personal growth support, and become an indispensable, integrated part of your life's journey, recalling minute details and overarching themes with staggering accuracy, weaving them into future interactions seamlessly."
            },
            {
              title: "Intuitive Multimodal & Sensory Interaction",
              icon: Aperture, // Changed icon for multimodal interaction for better visual distinction
              description: "Seamless and natural engagement through advanced voice commands, sophisticated visual recognition, haptic feedback, and diverse media formats. Interactions will be more fluid, intuitive, and responsive to how you naturally express yourself, blurring the lines between human and AI communication and making every interaction feel effortless and deeply connected."
            },
            {
              title: "Ethical AI Expansion & Societal Impact",
              icon: Handshake,
              description: "Further development of our ethical AI frameworks, ensuring continuous alignment with societal values and responsible deployment. This includes advanced capabilities for identifying and mitigating societal biases, ensuring fairness, and actively contributing to positive global impact through intelligent, empathetic solutions."
            },
            {
              title: "Adaptive Learning Ecosystem Integration",
              icon: GraduationCap,
              description: "Seamless integration with diverse learning platforms, professional development tools, and personal productivity suites. Quirra will intelligently pull context from your entire digital ecosystem, providing personalized insights, automated summaries, and proactive assistance across all your platforms, making your digital life more cohesive and productive."
            }
          ].map((future, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.7 }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(66, 153, 225, 0.8)" }}
              className="bg-[#1a203e] text-white rounded-2xl p-6 sm:p-8 md:p-10 border border-blue-900 shadow-xl min-h-[180px] sm:min-h-[220px] flex flex-col justify-start"
            >
              <h3 className="text-lg font-semibold text-blue-300 mb-2 sm:text-xl sm:mb-3 flex items-center gap-2 sm:gap-3">
                {future.icon && <future.icon size={24} className="text-blue-300 sm:size-28" />}
                {future.title}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed sm:text-sm">{future.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- */}

      {/* 7. Final CTA: Join the Future of Intelligence */}
      <section className="bg-[#0c12f] py-24 px-4 text-center relative z-10 border-t border-blue-900 sm:py-32">
        <h2 className="text-3xl font-bold text-blue-400 mb-8 leading-tight max-w-6xl mx-auto sm:text-4xl md:text-5xl md:mb-10">
          Quirra is not merely an AI tool—it&apos;s **your symbiotic second brain**, engineered for a future of enhanced productivity, profound understanding, and limitless human potential.
        </h2>
        <p className="text-base text-gray-300 mb-10 max-w-4xl mx-auto sm:text-xl md:text-2xl md:mb-14">
          Step into an era where AI truly works *with* you, adapting, learning, and empowering your unique journey. **Experience the future of intelligent partnership.**
        </p>
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(66, 153, 225, 1.2)" }}
          whileTap={{ scale: 0.95 }}
          className="inline-block"
        >
          <a href="/" className="inline-block">
            <Button className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-2xl hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:-translate-y-1 sm:px-14 sm:py-7 sm:text-2xl md:text-3xl">
              Experience the Quirra Prototype Today
            </Button>
          </a>
        </motion.div>
      </section>
    </main>
  );
}