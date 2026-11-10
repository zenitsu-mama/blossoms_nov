import { MapPin } from 'lucide-react';
import { ComicOpening, shouldPlayOpening } from '@/components/comic/ComicOpening';
import HomeLanding from '@/features/public/landing/HomeLanding';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { useState } from 'react';

export type CategoryKey = 'arts' | 'literature' | 'stage' | 'theatre' | 'special';

interface DetailItem {
  name: string;
  time: string;
  venue: string;
}

interface DetailModal {
  title: string;
  subtitle: string;
  tag: string;
  accent: string;
  items: DetailItem[];
}

interface CategoryEventItem {
  id: string;
  title: string;
  subCategory: string;
  tagline: string;
  time: string;
  venue: string;
  teamSize: string;
  prize: string;
  badgeColor: string;
}

interface CategoryConfig {
  key: CategoryKey;
  cardTitle: string;
  headingTitle: string;
  subtitle: string;
  wingTag: string;
  heroHeadline: string;
  heroSummary: string;
  bgHex: string;
  filters: string[];
  events: CategoryEventItem[];
}

// ============================================================================
// 31 OFFICIAL BLOSSOMS EVENTS ACROSS ALL 5 CATEGORIES
// ============================================================================
export const CATEGORY_DATA: Record<CategoryKey, CategoryConfig> = {
  arts: {
    key: 'arts',
    cardTitle: 'ARTS',
    headingTitle: 'FINE ARTS',
    subtitle: 'PAINT. DESIGN. EXPRESS.',
    wingTag: 'BLOSSOMS 2026 • FINE ARTS WING',
    heroHeadline: 'UNLEASH YOUR INNER COMIC ARTIST!',
    heroSummary: '10 Flagship Competitions • ₹50,000 Prize Pool • Live Courtyard & Studio Showdowns',
    bgHex: '#ed1e79',
    filters: ['ALL', 'PAINTING', 'SKETCHING', 'DESIGN', 'CRAFT', 'DIGITAL'],
    events: [
      {
        id: 'digital-poster',
        title: 'DIGITAL POSTER MAKING',
        subCategory: 'DIGITAL',
        tagline: 'High-concept digital poster design on theme with typography & layout.',
        time: 'Nov 26 • Online',
        venue: 'Online Submission',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#38bdf8',
      },
      {
        id: 'greeting-card',
        title: 'GREETING CARD COMPETITION',
        subCategory: 'CRAFT',
        tagline: 'Handcrafted greeting card design using mixed craft & calligraphy.',
        time: 'Nov 13 • Classroom',
        venue: 'Classroom',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#FFD43B',
      },
      {
        id: 'pot-art',
        title: 'POT ART',
        subCategory: 'CRAFT',
        tagline: 'Terracotta pot painting & decorative 3D embellishment battle.',
        time: 'Nov 20 • BB COURT',
        venue: 'BB Court',
        teamSize: 'Solo / Duo',
        prize: '₹5,000',
        badgeColor: '#fb923c',
      },
      {
        id: 'pencil-sketching',
        title: 'PENCIL SKETCHING',
        subCategory: 'SKETCHING',
        tagline: 'Live shading, perspective & realistic anatomical rendering.',
        time: 'Nov 14 • Classroom',
        venue: 'Classroom',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#e2e8f0',
      },
      {
        id: 'reel-making',
        title: 'REEL MAKING',
        subCategory: 'DIGITAL',
        tagline: '60-second creative cinematic reel storytelling challenge.',
        time: 'Dec 02 • Online',
        venue: 'Online Submission',
        teamSize: 'Solo / Duo',
        prize: '₹5,000',
        badgeColor: '#f472b6',
      },
      {
        id: 'collage',
        title: 'COLLAGE',
        subCategory: 'CRAFT',
        tagline: 'Magazine, newspaper & mixed material thematic montage.',
        time: 'Dec 05 • Classroom',
        venue: 'Classroom',
        teamSize: 'Team of 2',
        prize: '₹5,000',
        badgeColor: '#a78bfa',
      },
      {
        id: 'mehendi-design',
        title: 'MEHENDI DESIGN',
        subCategory: 'DESIGN',
        tagline: 'Intricate traditional & contemporary henna art championship.',
        time: 'Nov 21 • Classroom',
        venue: 'Classroom',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#fde047',
      },
      {
        id: 'rangoli-design',
        title: 'RANGOLI DESIGN',
        subCategory: 'DESIGN',
        tagline: 'Vibrant geometric & thematic rangoli dry powder floor artwork.',
        time: 'Nov 26 • Block 2 Entrance',
        venue: 'Block 2 Entrance',
        teamSize: 'Team of 3',
        prize: '₹5,000',
        badgeColor: '#fb7185',
      },
      {
        id: 'painting',
        title: 'PAINTING (WATER / ACRYLIC / OIL)',
        subCategory: 'PAINTING',
        tagline: 'Live acrylic, oil, and watercolor fine art canvas showdown.',
        time: 'Dec 02 • Classroom',
        venue: 'Classroom',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#2dd4bf',
      },
      {
        id: 'photography',
        title: 'PHOTOGRAPHY (ONLINE)',
        subCategory: 'DIGITAL',
        tagline: 'Campus documentary and fine art storytelling photography.',
        time: 'Dec 09 • Online',
        venue: 'Online Submission',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#818cf8',
      },
    ],
  },
  literature: {
    key: 'literature',
    cardTitle: 'LITERARY',
    headingTitle: 'LITERARY ARTS',
    subtitle: 'SPEAK. WRITE. THINK.',
    wingTag: 'BLOSSOMS 2026 • LITERARY SOCIETY',
    heroHeadline: 'WORDS ARE YOUR GREATEST SUPERPOWER!',
    heroSummary: '8 Flagship Competitions • ₹50,000 Prize Pool • Debates, Quizzes & Writing Showdowns',
    bgHex: '#0088e8',
    filters: ['ALL', 'DEBATE', 'QUIZ', 'WRITING', 'SPEAKING'],
    events: [
      {
        id: 'general-quiz',
        title: 'GENERAL QUIZ',
        subCategory: 'QUIZ',
        tagline: 'Multi-round buzzer quiz on pop-culture, science, history & trivia.',
        time: 'Nov 25 • Panel Room',
        venue: 'Panel Room',
        teamSize: 'Team of 3',
        prize: '₹8,000',
        badgeColor: '#38bdf8',
      },
      {
        id: 'pot-pourri',
        title: 'POT POURRI',
        subCategory: 'QUIZ',
        tagline: 'Fast-paced word play, 20 questions, anagrams & literary puzzles.',
        time: 'Dec 06 • Seminar Hall',
        venue: 'Seminar Hall',
        teamSize: 'Team of 2',
        prize: '₹6,000',
        badgeColor: '#4ade80',
      },
      {
        id: 'extempore',
        title: 'EXTEMPORE',
        subCategory: 'SPEAKING',
        tagline: 'Two minutes of prep, three minutes of spontaneous impromptu rhetoric.',
        time: 'Nov 28 • Panel Room',
        venue: 'Panel Room',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#f472b6',
      },
      {
        id: 'dumb-charades',
        title: 'DUMB CHARADES',
        subCategory: 'SPEAKING',
        tagline: 'Silent mime decoding of classic cinema, literature & idioms.',
        time: 'Nov 19 • Seminar Hall',
        venue: 'Seminar Hall',
        teamSize: 'Team of 3',
        prize: '₹6,000',
        badgeColor: '#fb7185',
      },
      {
        id: 'air-crash',
        title: 'AIR CRASH / SHIPWRECK',
        subCategory: 'SPEAKING',
        tagline: 'Roleplay a famous persona and convince the captain why you deserve the parachute.',
        time: 'Nov 24 • Panel Room',
        venue: 'Panel Room',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#fb923c',
      },
      {
        id: 'debate',
        title: 'DEBATE',
        subCategory: 'DEBATE',
        tagline: 'Parliamentary debate format with sharp arguments & counter-rebuttals.',
        time: 'Dec 01 • Seminar Hall',
        venue: 'Seminar Hall',
        teamSize: 'Duo',
        prize: '₹7,000',
        badgeColor: '#FFD43B',
      },
      {
        id: 'jam',
        title: 'JUST A MINUTE (JAM)',
        subCategory: 'SPEAKING',
        tagline: 'Speak for 60 seconds without hesitation, repetition, or grammatical stumble.',
        time: 'Nov 18 • Assembly Hall',
        venue: 'Assembly Hall',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#e879f9',
      },
      {
        id: 'creative-writing',
        title: 'CREATIVE WRITING (POEM / STORY / ESSAY)',
        subCategory: 'WRITING',
        tagline: 'Spin captivating prose and poetic imagery from spontaneous fest prompts.',
        time: 'Dec 08–11 • Classroom',
        venue: 'Classroom',
        teamSize: 'Solo',
        prize: '₹5,000',
        badgeColor: '#a78bfa',
      },
    ],
  },
  stage: {
    key: 'stage',
    cardTitle: 'STAGE',
    headingTitle: 'MAINSTAGE & MUSIC',
    subtitle: 'PERFORM. INSPIRE.',
    wingTag: 'BLOSSOMS 2026 • MAINSTAGE & MUSIC WING',
    heroHeadline: 'TURN THE AMPLIFIERS TO ELEVEN!',
    heroSummary: '8 Flagship Competitions • ₹1,20,000 Prize Pool • Full Concert Rig & Open Stages',
    bgHex: '#fdb813',
    filters: ['ALL', 'DANCE', 'MUSIC', 'BANDS'],
    events: [
      {
        id: 'indian-classical-group',
        title: 'INDIAN DANCE CLASSICAL (GROUP)',
        subCategory: 'DANCE',
        tagline: 'Graceful Bharatanatyam, Kathak & classical Indian group choreography.',
        time: 'Nov 22 • Open Stage',
        venue: 'Open Stage',
        teamSize: '6–12 Members',
        prize: '₹15,000',
        badgeColor: '#f43f5e',
      },
      {
        id: 'non-theme-dance',
        title: 'NON-THEME GROUP DANCE',
        subCategory: 'DANCE',
        tagline: 'High-energy Bollywood, hip-hop & contemporary dance crew showdown.',
        time: 'Dec 16 • KE (doc)',
        venue: 'KE (doc)',
        teamSize: '8–16 Members',
        prize: '₹15,000',
        badgeColor: '#ec4899',
      },
      {
        id: 'bob-western',
        title: 'BATTLE OF THE BANDS (WESTERN)',
        subCategory: 'BANDS',
        tagline: '20-minute rock, metal & alternative band set on full festival rig.',
        time: 'TBD • KE (doc)',
        venue: 'KE (doc)',
        teamSize: '4–8 Members',
        prize: '₹25,000',
        badgeColor: '#38bdf8',
      },
      {
        id: 'bob-indian',
        title: 'BATTLE OF THE BANDS (INDIAN)',
        subCategory: 'BANDS',
        tagline: 'Indian fusion, rock & folk band showdown with live acoustics.',
        time: 'TBD • Open Stage',
        venue: 'Open Stage',
        teamSize: '4–8 Members',
        prize: '₹25,000',
        badgeColor: '#fb923c',
      },
      {
        id: 'folk-film-solo',
        title: 'INDIAN FOLK & FILM SINGING (SOLO)',
        subCategory: 'MUSIC',
        tagline: 'Soulful Indian classical, folk & retro cinematic melodies.',
        time: 'Dec 03 • 911',
        venue: 'Room 911',
        teamSize: 'Solo',
        prize: '₹8,000',
        badgeColor: '#FFD43B',
      },
      {
        id: 'western-solo',
        title: 'WESTERN SINGING (SOLO)',
        subCategory: 'MUSIC',
        tagline: 'Pop, soul, jazz & acoustic Western vocal championship.',
        time: 'Dec 03 • 911',
        venue: 'Room 911',
        teamSize: 'Solo',
        prize: '₹8,000',
        badgeColor: '#4ade80',
      },
      {
        id: 'western-acapella',
        title: 'WESTERN ACAPELLA / ACOUSTIC GROUP',
        subCategory: 'MUSIC',
        tagline: 'Harmonized vocal beatboxing & multi-part choral arrangements.',
        time: 'TBD • KE (doc)',
        venue: 'KE (doc)',
        teamSize: '6–12 Members',
        prize: '₹15,000',
        badgeColor: '#a855f7',
      },
      {
        id: 'duet-dance',
        title: 'DANCE DUET',
        subCategory: 'DANCE',
        tagline: 'Two-person synchronization, chemistry & dynamic dance duet.',
        time: 'Nov 17 • Birds park (stage)',
        venue: 'Birds Park (Stage)',
        teamSize: 'Duo',
        prize: '₹10,000',
        badgeColor: '#06b6d4',
      },
    ],
  },
  theatre: {
    key: 'theatre',
    cardTitle: 'THEATRE',
    headingTitle: 'THEATRICAL ARTS',
    subtitle: 'ACT. IMAGINE. BRING STORIES ALIVE.',
    wingTag: 'BLOSSOMS 2026 • DRAMATICS GUILD',
    heroHeadline: 'EVERY STAGE IS A NEW UNIVERSE!',
    heroSummary: '5 Flagship Competitions • ₹75,000 Prize Pool • Proscenium, Street & Screen',
    bgHex: '#861ec2',
    filters: ['ALL', 'DRAMA', 'STREET', 'FILM', 'SOLO'],
    events: [
      {
        id: 'mono-act',
        title: 'MONO ACT',
        subCategory: 'SOLO',
        tagline: 'One performer, multiple personas, five intense minutes of pure dramatic grip.',
        time: 'Nov 27 • 911',
        venue: 'Room 911',
        teamSize: 'Solo',
        prize: '₹8,000',
        badgeColor: '#38bdf8',
      },
      {
        id: 'proscenium',
        title: 'PROSCENIUM',
        subCategory: 'DRAMA',
        tagline: 'Full stage theatrical production with elaborate sets, lighting & sound.',
        time: 'Dec 04 • KE (doc)',
        venue: 'KE (doc)',
        teamSize: '8–15 Members',
        prize: '₹20,000',
        badgeColor: '#FFD43B',
      },
      {
        id: 'street-play',
        title: 'STREET PLAY (NUKKAD NATAK)',
        subCategory: 'STREET',
        tagline: 'High-energy circle street theatre with acoustic dholak, chorus & social punch.',
        time: 'Dec 15 • Garden Street',
        venue: 'Garden Street',
        teamSize: '10–18 Members',
        prize: '₹20,000',
        badgeColor: '#4ade80',
      },
      {
        id: 'short-film',
        title: 'SHORT FILM MAKING',
        subCategory: 'FILM',
        tagline: 'Original short film screening evaluated for direction, cinematography & script.',
        time: 'Nov 21 submission • Dec 09 screening',
        venue: 'Campus View',
        teamSize: 'Team of 3–6',
        prize: '₹12,000',
        badgeColor: '#fb923c',
      },
      {
        id: 'mime',
        title: 'MIME',
        subCategory: 'DRAMA',
        tagline: 'Silent physical theatre telling powerful stories through gesture & expression.',
        time: 'Dec 10 • KE (doc)',
        venue: 'KE (doc)',
        teamSize: '6–10 Members',
        prize: '₹12,000',
        badgeColor: '#ec4899',
      },
    ],
  },
  special: {
    key: 'special',
    cardTitle: 'SPECIAL EVENTS',
    headingTitle: 'FLAGSHIP HEADLINERS',
    subtitle: 'CEREMONIES. BATTLES. FINALE.',
    wingTag: 'BLOSSOMS 2026 • FLAGSHIP SERIES',
    heroHeadline: 'THE ULTIMATE FESTIVAL ARENA!',
    heroSummary: '4 Flagship Spectacles • ₹1,00,000+ Prize Pool • Amphitheatre & Main Auditorium',
    bgHex: '#00966b',
    filters: ['ALL', 'CEREMONY', 'BANDS', 'HEADLINER'],
    events: [
      {
        id: 'inauguration',
        title: 'BLOSSOMS INAUGURATION',
        subCategory: 'CEREMONY',
        tagline: 'Grand opening ceremony, ceremonial lamp lighting, dignitaries keynote & theme unveil.',
        time: 'Nov 12 • 09:30 AM',
        venue: "Bird's Park Amphitheatre",
        teamSize: 'Open to All',
        prize: 'Honorary Trophy',
        badgeColor: '#38bdf8',
      },
      {
        id: 'bob-indian-special',
        title: 'BATTLE OF THE BANDS (INDIAN)',
        subCategory: 'BANDS',
        tagline: 'High-voltage Indian fusion, rock & folk band showdown on the open-air concert rig.',
        time: 'Dec 12 • Open Stage',
        venue: 'Open Air Stage',
        teamSize: '4–8 Members',
        prize: '₹25,000',
        badgeColor: '#fb923c',
      },
      {
        id: 'acoustic-group-special',
        title: 'WESTERN ACOUSTIC & ACAPELLA',
        subCategory: 'HEADLINER',
        tagline: 'Harmonized vocal arrangements, beatboxing, and multi-part choral arrangements.',
        time: 'Dec 14 • KE (doc)',
        venue: 'KE (doc) Auditorium',
        teamSize: '6–12 Members',
        prize: '₹15,000',
        badgeColor: '#FFD43B',
      },
      {
        id: 'valedictory',
        title: 'GRAND VALEDICTORY & AWARDS',
        subCategory: 'CEREMONY',
        tagline: 'Championship trophy presentation, overall house winners & festival culmination.',
        time: 'Dec 16 • Main Auditorium',
        venue: 'Main Auditorium',
        teamSize: 'All Houses',
        prize: 'Grand Trophy',
        badgeColor: '#4ade80',
      },
    ],
  },
};

const PANEL_DETAILS: Record<string, DetailModal> = {
  arts: {
    title: 'ARTS',
    subtitle: 'PAINT. DESIGN. EXPRESS.',
    tag: 'Fine Arts Wing • 10 Events',
    accent: '#ed1e79',
    items: [
      { name: 'Digital Poster Making', time: 'Nov 26', venue: 'Online Submission' },
      { name: 'Greeting Card Competition', time: 'Nov 13', venue: 'Classroom' },
      { name: 'Pot Art', time: 'Nov 20', venue: 'BB COURT' },
      { name: 'Pencil Sketching', time: 'Nov 14', venue: 'Classroom' },
      { name: 'Reel Making', time: 'Dec 02', venue: 'Online Submission' },
      { name: 'Collage', time: 'Dec 05', venue: 'Classroom' },
      { name: 'Mehendi Design', time: 'Nov 21', venue: 'Classroom' },
      { name: 'Rangoli Design', time: 'Nov 26', venue: 'Block 2 Front Entrance' },
      { name: 'Painting (Water / Acrylic / Oil)', time: 'Dec 02', venue: 'Classroom' },
      { name: 'Photography (Online)', time: 'Dec 09', venue: 'Online Submission' },
    ],
  },
  literature: {
    title: 'LITERARY',
    subtitle: 'SPEAK. WRITE. THINK.',
    tag: 'Literary Society • 8 Events',
    accent: '#0088e8',
    items: [
      { name: 'General Quiz', time: 'Nov 25', venue: 'Panel Room' },
      { name: 'Pot Pourri', time: 'Dec 06', venue: 'Seminar Hall' },
      { name: 'Extempore', time: 'Nov 28', venue: 'Panel Room' },
      { name: 'Dumb Charades', time: 'Nov 19', venue: 'Seminar Hall' },
      { name: 'Air Crash / Shipwreck', time: 'Nov 24', venue: 'Panel Room' },
      { name: 'Debate', time: 'Dec 01', venue: 'Seminar Hall' },
      { name: 'Just A Minute (JAM)', time: 'Nov 18', venue: 'Assembly Hall' },
      { name: 'Creative Writing', time: 'Dec 08-11', venue: 'Classroom' },
    ],
  },
  stage: {
    title: 'STAGE',
    subtitle: 'PERFORM. INSPIRE.',
    tag: 'Mainstage & Music • 8 Events',
    accent: '#fdb813',
    items: [
      { name: 'Indian Dance Classical (Group)', time: 'Nov 22', venue: 'Open Stage' },
      { name: 'Non-Theme Group Dance', time: 'Dec 16', venue: 'KE (doc)' },
      { name: 'Battle of the Bands (Western)', time: 'TBD', venue: 'KE (doc)' },
      { name: 'Battle of the Bands (Indian)', time: 'TBD', venue: 'Open Stage' },
      { name: 'Indian Folk & Film Singing (Solo)', time: 'Dec 03', venue: '911' },
      { name: 'Western Singing (Solo)', time: 'Dec 03', venue: '911' },
      { name: 'Western Acapella / Acoustic', time: 'TBD', venue: 'KE (doc)' },
      { name: 'Dance Duet', time: 'Nov 17', venue: 'Birds park (stage)' },
    ],
  },
  theatre: {
    title: 'THEATRE',
    subtitle: 'ACT. IMAGINE. BRING STORIES ALIVE.',
    tag: 'Dramatics Guild • 5 Events',
    accent: '#861ec2',
    items: [
      { name: 'Mono Act', time: 'Nov 27', venue: '911' },
      { name: 'Proscenium', time: 'Dec 04', venue: 'KE (doc)' },
      { name: 'Street Play (Nukkad Natak)', time: 'Dec 15', venue: 'Garden Street' },
      { name: 'Short Film Making', time: 'Nov 21 / Dec 09', venue: 'Campus View' },
      { name: 'Mime', time: 'Dec 10', venue: 'KE (doc)' },
    ],
  },
  special: {
    title: 'SPECIAL EVENTS',
    subtitle: 'CEREMONIES. BATTLES. FINALE.',
    tag: 'Flagship Series • 4 Headliners',
    accent: '#00966b',
    items: [
      { name: 'Blossoms Inauguration Ceremony', time: 'Nov 12', venue: "Bird's Park Amphitheatre" },
      { name: 'Battle of the Bands (Indian)', time: 'Dec 12', venue: 'Open Air Stage' },
      { name: 'Western Acoustic & Acapella', time: 'Dec 14', venue: 'KE (doc) Audi' },
      { name: 'Grand Valedictory & Awards Ceremony', time: 'Dec 16', venue: 'Main Auditorium' },
    ],
  },
  schedule: {
    title: 'EVENT SCHEDULE',
    subtitle: 'DATES, TIMINGS & VENUES',
    tag: 'Nov 12 – Dec 15, 2026 • Official Lineup',
    accent: '#df1b23',
    items: [
      { name: 'SWO & DOC Inauguration', time: '12-13.11.2026', venue: "Birds park" },
      { name: 'Air Crash / Shipwreck', time: '14.11.2026', venue: 'Seminar Hall' },
      { name: 'Debate', time: '16.11.2026', venue: 'Assembly hall' },
      { name: 'Pot Pourri / Mono Acting', time: '17.11.2026', venue: 'Panel room / 911' },
      { name: 'Mixed Media Pot (Pot Art)', time: '18.11.2026', venue: 'Gazebo / BB court' },
      { name: 'Rangoli Design', time: '19.11.2026', venue: 'B2 inside' },
      { name: 'Mehendi Design', time: '20.11.2026', venue: 'Classrooms' },
      { name: 'General Quiz', time: '21.11.2026', venue: 'Classrooms' },
      { name: 'Impulse Solo Dance', time: '23.11.2026', venue: 'Birds park' },
      { name: 'Indian Duet Dance', time: '24.11.2026', venue: 'Birds park' },
      { name: 'Greeting Card Competition', time: '25.11.2026', venue: 'Classrooms' },
      { name: 'Just A Minute (JAM)', time: '26.11.2026', venue: 'Classrooms / Seminar Hall' },
      { name: 'Digital Poster Making', time: '29.11.2026', venue: 'Online Submission' },
      { name: 'Indian Classical Dance (Group)', time: '30.11.2026', venue: 'Birds park' },
      { name: 'Proscenium Theatre', time: '01.12.2026', venue: 'KE AUDI' },
      { name: 'Dumb Charades', time: '02.12.2026', venue: 'Classrooms' },
      { name: 'Pencil Sketching / Street Play', time: '03.12.2026', venue: 'Garden Street' },
      { name: 'Extempore', time: '04.12.2026', venue: 'Classroom' },
      { name: 'Photography (DSLR)', time: '06.12.2026', venue: 'Online Submission' },
      { name: 'Non-Theme Group Dance', time: '07.12.2026', venue: 'KE AUDI' },
      { name: 'Short Film Making', time: '08.12.2026', venue: 'Birds park & Online' },
      { name: 'BOB Western, Indian & Acoustic', time: '09.12.2026', venue: 'Campus View' },
      { name: 'Painting (Water / Acrylic / Oil)', time: '10.12.2026', venue: 'Classrooms' },
      { name: 'Reel Making / Creative Writing', time: '11.12.2026', venue: 'Classrooms / Online' },
      { name: 'Collage Making', time: '12.12.2026', venue: 'Gazebo / Classrooms' },
      { name: 'Western & Folk/Film Solo Singing', time: '14.12.2026', venue: 'Room 911' },
      { name: 'Mime Competition', time: '15.12.2026', venue: 'KE AUDI' },
    ],
  },
  announcements: {
    title: 'ANNOUNCEMENTS',
    subtitle: 'STAY UPDATED',
    tag: 'Live Fest Bulletin',
    accent: '#00966b',
    items: [
      { name: 'Student registration open! Log in with your 6-digit roll number.', time: 'Just now', venue: 'Portal' },
      { name: 'Stage pass QR codes are now active in the student dashboard.', time: '25m ago', venue: 'System' },
      { name: 'Battle of Bands soundcheck moved to 10:15 AM at KE doc.', time: '1h ago', venue: 'KE (doc)' },
      { name: 'Collect participant comic badges at Information Desk A.', time: '2h ago', venue: 'Main Gate' },
    ],
  },
  winners: {
    title: 'WINNERS & STANDINGS',
    subtitle: 'HALL OF HEROES 2026',
    tag: 'Live Inter-House Leaderboard',
    accent: '#fdb813',
    items: [
      { name: '1st: Phoenix House (1,420 pts)', time: 'Gold', venue: '6 Trophies' },
      { name: '2nd: Titan House (1,290 pts)', time: 'Silver', venue: '4 Trophies' },
      { name: '3rd: Astra House (1,180 pts)', time: 'Bronze', venue: '3 Trophies' },
      { name: '4th: Orion House (1,050 pts)', time: 'Runner-up', venue: '2 Trophies' },
    ],
  },
};

export default function HomePage() {

  const [playedOpening] = useState(shouldPlayOpening);
  const [openingDone, setOpeningDone] = useState(false);
  const [selectedModal, setSelectedModal] = useState<DetailModal | null>(null);

  return (
    <div className="min-h-screen w-full bg-[#793f98] text-[#0f0f0f] relative selection:bg-black selection:text-white">
      {playedOpening && !openingDone && <ComicOpening onDone={() => setOpeningDone(true)} />}

      <PublicHeader />
      <HomeLanding
        animateIn={playedOpening}
        ready={openingDone}
        onOpenSchedule={() => setSelectedModal(PANEL_DETAILS.schedule)}
        onOpenAnnouncements={() => setSelectedModal(PANEL_DETAILS.announcements)}
      />
      <Footer />

      {/* =========================================================================
          UNIVERSAL INTERACTIVE COMIC MODAL (Desktop & Mobile, Zero Shadows)
         ========================================================================= */}
      {selectedModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => {
            setSelectedModal(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#fdfaf0] border-[4px] border-[#0f0f0f] p-5 max-h-[85vh] flex flex-col relative rounded-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b-[2.5px] border-[#0f0f0f]">
              <div>
                <div
                  className="inline-block px-2.5 py-0.5 border-[2px] border-[#0f0f0f] font-comic-sub text-[11px] font-bold text-white mb-1"
                  style={{ backgroundColor: selectedModal.accent }}
                >
                  {selectedModal.tag}
                </div>
                <h3 className="font-comic-display text-[34px] leading-tight text-[#0f0f0f]">
                  {selectedModal.title}
                </h3>
                <p className="font-comic-sub text-[13px] text-neutral-700 font-bold">
                  {selectedModal.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModal(null);
                }}
                className="w-8 h-8 bg-[#f8ca16] border-[2px] border-[#0f0f0f] font-comic-display text-[18px] flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Items List */}
            <div className="mt-3.5 flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedModal.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border-[2.2px] border-[#0f0f0f] p-2.5 flex items-center justify-between rounded-lg"
                >
                  <div>
                    <p className="font-bold text-[13.5px] text-[#0f0f0f]">{item.name}</p>
                    <p className="text-[11.5px] text-neutral-600 font-semibold inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> {item.venue}</p>
                  </div>
                  <span className="bg-[#f8ca16] border-[1.8px] border-[#0f0f0f] px-2 py-0.5 font-comic-sub font-bold text-[12px] shrink-0">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
