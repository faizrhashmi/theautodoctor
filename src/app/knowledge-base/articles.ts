export type KnowledgeBaseArticle = {
  slug: string
  title: string
  description: string
  category: 'Guides' | 'Account' | 'Sessions'
  readingTime: string
  author: string
  publishedAt: string
  updatedAt?: string
  heroImage?: {
    src: string
    alt: string
    credit?: string
  }
  sections: Array<{
    heading: string
    body: string[]
    list?: string[]
  }>
  takeaways: string[]
  resources?: Array<{
    label: string
    href: string
  }>
}

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeBaseArticle[] = [
  {
    slug: 'prepare-for-diagnostic-session',
    title: 'How to Prepare for Your Diagnostic Session',
    description:
      'Make the most of your time with a mechanic by gathering the right info, capturing the best visuals and testing before the call.',
    category: 'Guides',
    readingTime: '6 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2024-10-12',
    updatedAt: '2025-02-01',
    heroImage: {
      src: '/hero-bg.jpg',
      alt: 'Customer preparing their vehicle for a virtual diagnostic session',
      credit: 'Photo by AskAutoDoctor crew'
    },
    sections: [
      {
        heading: '1. Capture What You Hear, See or Smell',
        body: [
          'Start by writing down everything you have noticed about the issue. When did it begin, how often does it happen and what driving conditions trigger it? Documenting these details helps our mechanics narrow the possibilities quickly.',
          'Use your phone to snap photos or a short video of warning lights, leaks, dashboard messages or anything unusual. Good lighting and a steady hand go a long way.'
        ],
        list: [
          'Photos of warning lights, leaks or damage',
          'Videos of noises or dashboard behaviour',
          'Any diagnostic or OBD-II codes already pulled'
        ]
      },
      {
        heading: '2. Collect Maintenance and Repair History',
        body: [
          'If you have recent invoices, warranty notes or DIY maintenance logs, keep them nearby. Knowing what has already been replaced prevents duplicate work and surfaces patterns our mechanics can spot instantly.'
        ],
        list: ['Last oil change and mileage', 'Recent services or repairs', 'Aftermarket parts or modifications']
      },
      {
        heading: '3. Test Basic Functions Before the Call',
        body: [
          'Check simple items like fluid levels, tire pressure and battery terminals. If you can safely reproduce the symptom in your driveway, do a dry run so you know how to trigger it while on video.'
        ],
        list: ['Confirm the vehicle starts and idles safely', 'Note any new vibrations, smells or smoke', 'Have a helper ready if you need to press pedals or hold the camera']
      },
      {
        heading: '4. Prepare Your Space & Connection',
        body: [
          'Park in a well-lit area with enough room to move around the vehicle. Wipe the camera lens on your phone, charge the battery and, if possible, join the session on Wi-Fi for the clearest stream. A portable light or headlamp is handy for under-hood shots.'
        ]
      },
      {
        heading: '5. Share Files Ahead of Time',
        body: [
          'Upload photos, PDFs or scanner reports in your dashboard before the session. Your mechanic reviews everything in advance so you can dive straight into next steps instead of searching for files live.'
        ],
        list: ['Upload files to your AskAutoDoctor dashboard', 'Label each file with the system or symptom it covers', 'Bring any outstanding questions you want answered live']
      }
    ],
    takeaways: [
      'Document the symptom with photos, video and written notes.',
      'Keep maintenance history close so nothing gets missed.',
      'Test and prep your space to avoid troubleshooting delays.',
      'Upload files early so your mechanic can hit the ground running.'
    ],
    resources: [
      { label: 'Booking checklist', href: '/how-it-works' },
      { label: 'Upload files in your dashboard', href: '/dashboard' }
    ]
  },
  {
    slug: 'diy-brake-replacement-success',
    title: 'How Sarah Saved $800 Replacing Her Own Brake Pads',
    description:
      'A first-time DIYer used a virtual session to walk through her brake job step-by-step, saving hundreds while gaining confidence.',
    category: 'Sessions',
    readingTime: '5 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-01-15',
    sections: [
      {
        heading: 'The Challenge',
        body: [
          'Sarah, a graphic designer from Portland, received a $950 quote for replacing brake pads and rotors on her 2018 Honda CR-V. The shop said it was urgent, but she wondered if she could tackle it herself.',
          'With no prior mechanical experience, she was nervous about safety and worried about making an expensive mistake. She needed expert guidance without committing to the full shop price.'
        ]
      },
      {
        heading: 'The Virtual Session',
        body: [
          'Sarah booked a 30-minute video session with Mike, a certified Honda technician. Before the call, she sent photos of her brake system and the shop quote.',
          'During the session, Mike inspected her brakes via video and confirmed the pads were worn but the rotors only needed resurfacing, not replacement. He walked her through each step while she performed the work in real-time.'
        ],
        list: [
          'Verified which parts actually needed replacement',
          'Provided step-by-step guidance on proper jack placement',
          'Showed her how to compress the caliper piston safely',
          'Confirmed proper installation and torque specs',
          'Tested the pedal feel and verified no air in the lines'
        ]
      },
      {
        heading: 'The Results',
        body: [
          'Sarah completed the job in 2 hours with $140 in parts from AutoZone and a $50 session fee. Total cost: $190 versus $950 at the shop.',
          '"I was terrified at first, but Mike made it so simple," Sarah shared. "He explained why each step mattered and caught me before I made mistakes. Now I feel confident enough to do my own oil changes too."'
        ]
      },
      {
        heading: 'Key Takeaway',
        body: [
          'Virtual sessions give DIYers the confidence to tackle repairs safely. With an expert watching in real-time, you avoid costly mistakes while building skills that save money for years.'
        ]
      }
    ],
    takeaways: [
      'Saved $760 by doing the work herself with virtual guidance',
      'Learned the job was simpler than the shop quote suggested',
      'Gained confidence for future DIY maintenance',
      'Had expert oversight to ensure safety and quality'
    ],
    resources: [
      { label: 'Book a DIY guidance session', href: '/intake?plan=diy' },
      { label: 'View pricing', href: '/pricing' }
    ]
  },
  {
    slug: 'pre-purchase-inspection-saved-thousands',
    title: 'Marcus Avoided a $6,000 Mistake with a Pre-Purchase Video Inspection',
    description:
      'A virtual pre-purchase inspection revealed hidden damage that would have cost thousands, saving a buyer from a bad deal.',
    category: 'Sessions',
    readingTime: '6 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-01-22',
    sections: [
      {
        heading: 'The Situation',
        body: [
          'Marcus found what seemed like the perfect deal: a 2016 BMW 328i with 68,000 miles for $18,500 on Facebook Marketplace. The seller had maintenance records and the car looked pristine in photos.',
          'Before making the 3-hour drive to see it, Marcus booked a virtual pre-purchase inspection. He asked the seller to do a video walkthrough, promising he was a serious buyer.'
        ]
      },
      {
        heading: 'What the Virtual Inspection Revealed',
        body: [
          'During the 45-minute video session, our mechanic Tom guided the seller through a comprehensive inspection. Everything looked good until they checked underneath.',
          'Tom noticed uneven tire wear and asked to see the suspension components up close. The video revealed fresh undercoating spray—a red flag that someone had recently tried to hide something.'
        ],
        list: [
          'Front subframe showed signs of previous accident damage',
          'Freshly painted areas under the car indicated recent cover-up work',
          'Alignment angles suggested frame damage that would cause ongoing tire wear',
          'Oil pan had been resealed recently, likely due to impact damage',
          'CarFax was clean, but physical evidence told a different story'
        ]
      },
      {
        heading: 'The Outcome',
        body: [
          'Tom estimated $6,000-8,000 in repairs to properly fix the subframe, plus ongoing alignment issues that would eat tires every 15,000 miles.',
          'Marcus thanked the seller and walked away. Two weeks later, he found a clean 2017 Mazda6 that passed the same virtual inspection process. "That $75 video session saved me from the worst financial mistake of my life," Marcus said.'
        ]
      },
      {
        heading: 'Why Virtual Pre-Purchase Works',
        body: [
          'You get expert eyes on the vehicle before traveling or committing. Sellers who refuse a video walkthrough often have something to hide. Honest sellers appreciate buyers who do their homework.'
        ]
      }
    ],
    takeaways: [
      'Discovered hidden accident damage before making the purchase',
      'Saved $6,000+ in immediate repairs plus ongoing costs',
      'Avoided a 3-hour drive to see a problem vehicle',
      'Learned what red flags to watch for in future purchases'
    ],
    resources: [
      { label: 'Book pre-purchase inspection', href: '/intake?plan=pre-purchase' },
      { label: 'Pre-purchase checklist', href: '/knowledge-base/prepare-for-diagnostic-session' }
    ]
  },
  {
    slug: 'avoided-unnecessary-transmission-replacement',
    title: 'How a Second Opinion Saved Jason $4,200 on a Transmission',
    description:
      'A dealer said Jason needed a new transmission. A virtual second opinion revealed a simple $180 fix instead.',
    category: 'Sessions',
    readingTime: '5 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-02-03',
    sections: [
      {
        heading: 'The Diagnosis Shock',
        body: [
          'Jason\'s 2015 Ford Escape started jerking during shifts. He took it to the dealer, who ran diagnostics and delivered bad news: "Your transmission is failing. We recommend a replacement at $4,800, or a rebuild for $3,200."',
          'The service advisor showed him error codes P0735 and P0750, explaining that internal clutches were slipping. Jason felt sick—he still owed $8,000 on the car loan.'
        ]
      },
      {
        heading: 'The Virtual Second Opinion',
        body: [
          'Before authorizing the work, Jason uploaded his diagnostic report to AskAutoDoctor and booked a chat session with transmission specialist Linda.',
          'Linda reviewed the codes and asked Jason specific questions about when the symptoms occurred. She noticed something the dealer missed: the issue only happened when the car was cold and disappeared after warming up.'
        ],
        list: [
          'P0735 pointed to 5th gear ratio issues—but not necessarily internal damage',
          'P0750 could indicate a shift solenoid, not the whole transmission',
          'Cold-start symptoms suggested fluid flow issues, not mechanical failure',
          'Linda recommended testing the shift solenoid first—a $180 part plus 1 hour labor'
        ]
      },
      {
        heading: 'The Real Fix',
        body: [
          'Jason took Linda\'s findings to an independent shop. They replaced the shift solenoid for $320 total. The jerking stopped immediately.',
          '"I was hours away from approving a $4,800 transmission replacement I didn\'t need," Jason said. "That $60 chat session literally saved my finances. Now I get a second opinion on everything major."'
        ]
      },
      {
        heading: 'Why Dealers Push Big Repairs',
        body: [
          'Dealerships often recommend the most comprehensive fix to avoid comebacks and maximize service revenue. Independent mechanics and virtual consultations focus on the most likely cause first, saving you thousands in unnecessary work.'
        ]
      }
    ],
    takeaways: [
      'Saved $4,480 by getting a second opinion before authorizing repairs',
      'Learned that error codes don\'t always mean catastrophic failure',
      'Found the real problem with targeted diagnostics',
      'Built trust in seeking expert advice before major repairs'
    ],
    resources: [
      { label: 'Get a second opinion', href: '/intake?plan=second-opinion' },
      { label: 'Understanding diagnostic codes', href: '/knowledge-base' }
    ]
  },
  {
    slug: 'emergency-roadside-diagnosis',
    title: 'Stranded at 11 PM: How Emma Got Back on the Road in 20 Minutes',
    description:
      'An emergency virtual session diagnosed a simple fix that saved Emma from an expensive tow and hotel stay.',
    category: 'Sessions',
    readingTime: '4 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-02-10',
    sections: [
      {
        heading: 'Stranded in the Dark',
        body: [
          'Emma was driving home from visiting family—90 miles from home at 11 PM—when her 2019 Chevy Malibu suddenly lost power and the check engine light started flashing.',
          'She pulled over safely but the car wouldn\'t restart. AAA quoted 2-hour wait for a tow, plus she\'d need a hotel since no shops were open. She was looking at $400+ before even diagnosing the problem.'
        ]
      },
      {
        heading: 'The Emergency Video Call',
        body: [
          'Emma found AskAutoDoctor through a Google search for "emergency car help" and connected with mechanic Carlos via video within 3 minutes.',
          'Carlos walked her through some quick checks using her phone\'s flashlight. When she showed him the engine bay, he immediately spotted the problem: a loose electrical connector on the throttle body.'
        ],
        list: [
          'Flashing check engine light indicated a severe misfire or throttle issue',
          'Carlos noticed the connector was partially unplugged—likely from recent service',
          'He guided Emma to push the connector firmly until it clicked',
          'The car started immediately and ran smoothly',
          'Carlos cleared the codes using her OBD-II reader and confirmed safe to drive'
        ]
      },
      {
        heading: 'Back on the Road',
        body: [
          'Total time: 18 minutes. Total cost: $40 for the emergency session. Emma was back on the road and home by midnight.',
          '"I was almost in tears when the car died," Emma recalled. "Carlos was so calm and patient. He saved me hundreds of dollars and got me home safely. I keep AskAutoDoctor bookmarked now for any car emergency."'
        ]
      },
      {
        heading: 'When to Use Emergency Sessions',
        body: [
          'Not every breakdown needs a tow. Many issues are simple fixes if you have expert guidance. Emergency virtual sessions are perfect for diagnosing the problem, determining if it\'s safe to drive, and avoiding unnecessary towing costs.'
        ]
      }
    ],
    takeaways: [
      'Avoided $400+ in towing and hotel costs',
      'Got expert help within 3 minutes, even late at night',
      'Learned a simple fix that got her home safely',
      'Now keeps virtual mechanic help bookmarked for future emergencies'
    ],
    resources: [
      { label: 'Start emergency session', href: '/intake?urgent=true' },
      { label: 'How emergency sessions work', href: '/how-it-works' }
    ]
  },
  {
    slug: 'first-time-car-owner-education',
    title: 'New Driver Alex Learned Car Basics in 3 Sessions',
    description:
      'A first-time car owner gained confidence and knowledge through virtual education sessions, preventing costly mistakes.',
    category: 'Sessions',
    readingTime: '6 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-02-18',
    sections: [
      {
        heading: 'New Car, New Worries',
        body: [
          'Alex, 23, just bought their first car—a used 2017 Toyota Corolla with 85,000 miles. They knew nothing about car maintenance and felt overwhelmed by all the dashboard warnings, fluid checks, and maintenance schedules.',
          '"I was terrified I\'d break something or ignore a serious problem," Alex admitted. "My parents always handled this stuff. I needed to learn but didn\'t know where to start."'
        ]
      },
      {
        heading: 'Session 1: Dashboard Walkthrough',
        body: [
          'In the first 30-minute session, mechanic Maria gave Alex a complete dashboard tour via video. They went through every warning light, gauge, and button.',
          'Maria explained what each warning meant, which ones required immediate action, and which were routine maintenance reminders. Alex took notes and screenshots for future reference.'
        ],
        list: [
          'Learned the difference between yellow warnings (maintenance soon) and red alerts (stop immediately)',
          'Understood tire pressure monitoring and how to check/adjust properly',
          'Discovered how to check oil level, coolant, and windshield washer fluid',
          'Got tips on fuel economy and when premium gas actually matters (it didn\'t for Alex\'s car)'
        ]
      },
      {
        heading: 'Session 2: Maintenance Schedule Deep-Dive',
        body: [
          'The second session focused on what maintenance the Corolla actually needed. Maria reviewed the owner\'s manual with Alex and created a simple calendar.',
          'They discussed which services could be DIY (like air filters and wiper blades) versus shop work (like transmission service). This helped Alex budget and plan ahead.'
        ]
      },
      {
        heading: 'Session 3: Identifying Problems Early',
        body: [
          'In the final session, Maria taught Alex how to spot issues before they become expensive. They practiced listening for unusual sounds, checking for leaks, and monitoring performance changes.',
          '"Now I do a quick walk-around before driving," Alex shared. "I check tire condition, look under the car, and listen for new noises. It takes 30 seconds but could save me thousands."'
        ]
      },
      {
        heading: 'The Confidence Payoff',
        body: [
          'Three months later, Alex noticed a slight coolant smell. Instead of panicking, they booked a quick diagnostic session. The mechanic identified a small hose leak—a $60 fix. If ignored, it could have caused overheating and engine damage.',
          '"These sessions turned me from a clueless car owner to someone who actually understands what\'s happening," Alex said. "I\'m not a mechanic, but I know enough to avoid getting ripped off and catch problems early."'
        ]
      }
    ],
    takeaways: [
      'Gained essential car knowledge in just 3 hours of sessions',
      'Learned to distinguish between urgent issues and routine maintenance',
      'Caught a small problem early, preventing major damage',
      'Built confidence to handle car ownership independently'
    ],
    resources: [
      { label: 'Book an education session', href: '/intake?plan=learn' },
      { label: 'New car owner resources', href: '/knowledge-base' }
    ]
  },
  {
    slug: 'mystery-noise-diagnosis-success',
    title: 'From Mystery Rattle to Simple Fix: David\'s Diagnostic Journey',
    description:
      'A persistent noise had multiple shops stumped. A virtual session identified the cause in 15 minutes using methodical troubleshooting.',
    category: 'Sessions',
    readingTime: '5 min read',
    author: 'AskAutoDoctor Support Team',
    publishedAt: '2025-02-25',
    sections: [
      {
        heading: 'The Mystery Noise',
        body: [
          'David\'s 2020 Subaru Outback developed a rattling sound from the front end—but only over bumps, only when cold, and only turning right. Three shops test-drove it but couldn\'t reproduce or diagnose the issue.',
          'Shop A said it might be suspension bushings ($800). Shop B guessed strut mounts ($650). Shop C recommended replacing multiple components "to be safe" ($1,400). Nobody could pinpoint the actual problem.'
        ]
      },
      {
        heading: 'The Virtual Diagnostic Approach',
        body: [
          'Frustrated, David booked a video session with diagnostic specialist Rachel. Before the call, she had him capture video with sound in various conditions.',
          'During the session, Rachel used a methodical isolation approach—having David press on different components while she watched and listened via video.'
        ],
        list: [
          'Ruled out suspension by having David bounce each corner while stationary',
          'Eliminated brake components by testing with parking brake engaged',
          'Asked David to turn the wheel while someone rocked the car side to side',
          'Had him spray water on the front bumper area while reproducing the sound',
          'The rattle got louder with water—indicating a loose plastic component, not mechanical'
        ]
      },
      {
        heading: 'The Simple Solution',
        body: [
          'Rachel identified a loose skid plate bolt that was only making noise when cold (metal contraction) and turning right (shifted position). The fix: tightening four bolts.',
          'David went to a quick-lube shop and had them tighten the skid plate for $15. The noise disappeared completely.',
          '"I almost spent $1,400 replacing parts I didn\'t need," David said. "Rachel\'s systematic approach found the issue in 15 minutes when three shops with the car in their bays couldn\'t figure it out."'
        ]
      },
      {
        heading: 'Why Virtual Diagnostics Work for Noises',
        body: [
          'Intermittent issues are notoriously hard to diagnose in a shop environment. Virtual sessions let you reproduce the problem in real-world conditions while an expert guides the troubleshooting process. No pressure to approve expensive repairs on the spot.'
        ]
      }
    ],
    takeaways: [
      'Saved $1,385 by finding the real problem instead of guessing',
      'Learned systematic diagnostic methods for future issues',
      'Got expert help without paying diagnostic fees at multiple shops',
      'Solved a problem that stumped three in-person mechanics'
    ],
    resources: [
      { label: 'Book diagnostic session', href: '/intake?plan=diagnostic' },
      { label: 'Prepare for your session', href: '/knowledge-base/prepare-for-diagnostic-session' }
    ]
  }
]
