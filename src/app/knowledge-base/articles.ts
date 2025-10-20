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
  }
]
