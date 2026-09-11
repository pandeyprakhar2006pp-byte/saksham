export const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#impact", label: "Impact" },
  { href: "#contact", label: "Contact Us" },
]

export const FEATURE_CARDS = [
  {
    title: "Voice & audio",
    description:
      "Questions are read aloud with text-to-speech and answered by speaking. The Web Speech API turns spoken words into a recorded response, with a spoken confirmation read back before it's saved.",
    icon: "MicIcon" as const,
    accent: "primary" as const,
  },
  {
    title: "ISL & captions",
    description:
      "Every question and instruction has a matching Indian Sign Language video, plus a running caption ticker for proctor messages, nothing depends on sound.",
    icon: "VideoIcon" as const,
    accent: "teal" as const,
  },
  {
    title: "Gesture engine",
    description:
      "On-device MediaPipe hand tracking reads a finger-spelled letter through the webcam, no extra software, and nothing leaves the browser until an answer is confirmed.",
    icon: "HandIcon" as const,
    accent: "emerald" as const,
  },
]

export const FLOW_STEPS = [
  {
    num: "01",
    title: "Choose your mode",
    description: "Select screen reader, ISL video, or gesture mode at login. Change it later without losing progress.",
  },
  {
    num: "02",
    title: "Content, delivered",
    description: "Each question arrives as speech, an ISL clip, or on screen text, whichever the candidate picked.",
  },
  {
    num: "03",
    title: "Answer your way",
    description: "Respond by voice, sign gesture, or keyboard. Saksham records the answer the same way either way.",
  },
  {
    num: "04",
    title: "Submit, securely",
    description: "The session is proctored live and graded on a Next.js and MongoDB backend, same as any other candidate's.",
  },
]

export const TECH_ITEMS = [
  { label: "Frontend", value: "Next.js + TypeScript" },
  { label: "Voice layer", value: "Web Speech API" },
  { label: "Gesture engine", value: "MediaPipe Hands" },
  { label: "Database", value: "MongoDB" },
  { label: "Session state", value: "Redis" },
]

export const TRUST_CARDS = [
  {
    title: "Works on patchy networks",
    description:
      "Low bandwidth mode caches upcoming questions on the device and syncs answers automatically once the connection returns.",
    icon: "GlobeIcon" as const,
  },
  {
    title: "RPWD Act, 2016 aligned",
    description: "Built around the accommodations the Rights of Persons with Disabilities Act calls for, not bolted on after the fact.",
    icon: "ShieldIcon" as const,
  },
  {
    title: "Encrypted, session-aware",
    description:
      "Candidate data sits in MongoDB behind an encrypted connection, with Redis tracking session state so a dropped tab never loses an answer.",
    icon: "LockIcon" as const,
  },
]

export const PROBLEM_POINTS = [
  {
    stat: "2.68 crore",
    rest: " people in India live with a disability, and most exam platforms still assume a mouse and a screen only.",
  },
  {
    stat: null,
    rest: "A scribe helps one candidate at a time. Scribes are booked by hand, vary in quality, and can't scale to a national exam.",
  },
  {
    stat: null,
    rest: "Waiting on an accommodation request chips away at confidence before the exam even starts.",
  },
]

export const SOLUTION_POINTS = [
  "One platform speaks the question, signs it in ISL, or waits for a raised hand, no extra person in the room.",
  "Every candidate picks keyboard, voice, or gesture, and can switch mid exam if something isn't working.",
  "Runs on a low cost, serverless stack, so one platform covers both visual and hearing impairments instead of two separate systems.",
]
