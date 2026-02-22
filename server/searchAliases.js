// ============================================
// SEARCH ALIASES
// Maps common team nicknames to official names
// ============================================

const searchAliases = {
  // ============================================
  // BARCELONA
  // ============================================
  'barca': 'barcelona',
  'barça': 'barcelona',
  'fcb': 'barcelona',
  'blaugrana': 'barcelona',
  'cules': 'barcelona',
  
  // ============================================
  // REAL MADRID
  // ============================================
  'real': 'real madrid',
  'madrid': 'real madrid',
  'los blancos': 'real madrid',
  'blancos': 'real madrid',
  'rm': 'real madrid',
  'rmcf': 'real madrid',
  'merengues': 'real madrid',
  
  // ============================================
  // MANCHESTER UNITED
  // ============================================
  'man u': 'manchester united',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'mufc': 'manchester united',
  'red devils': 'manchester united',
  'devils': 'manchester united',
  'united': 'manchester united',
  
  // ============================================
  // MANCHESTER CITY
  // ============================================
  'man city': 'manchester city',
  'mcfc': 'manchester city',
  'city': 'manchester city',
  'citizens': 'manchester city',
  'cityzens': 'manchester city',
  
  // ============================================
  // LIVERPOOL
  // ============================================
  'lfc': 'liverpool',
  'pool': 'liverpool',
  'reds': 'liverpool',
  'scousers': 'liverpool',
  'kopites': 'liverpool',
  
  // ============================================
  // ARSENAL
  // ============================================
  'gunners': 'arsenal',
  'afc': 'arsenal',
  'gooners': 'arsenal',
  
  // ============================================
  // CHELSEA
  // ============================================
  'blues': 'chelsea',
  'cfc': 'chelsea',
  'pensioners': 'chelsea',
  
  // ============================================
  // TOTTENHAM
  // ============================================
  'spurs': 'tottenham',
  'thfc': 'tottenham',
  'lilywhites': 'tottenham',
  'yids': 'tottenham',
  
  // ============================================
  // JUVENTUS
  // ============================================
  'juve': 'juventus',
  'bianconeri': 'juventus',
  'old lady': 'juventus',
  'zebras': 'juventus',
  
  // ============================================
  // AC MILAN
  // ============================================
  'milan': 'ac milan',
  'acm': 'ac milan',
  'rossoneri': 'ac milan',
  
  // ============================================
  // INTER MILAN
  // ============================================
  'inter': 'inter milan',
  'nerazzurri': 'inter milan',
  
  // ============================================
  // PSG
  // ============================================
  'paris': 'psg',
  'paris sg': 'psg',
  'paris saint germain': 'psg',
  'parisiens': 'psg',
  
  // ============================================
  // BAYERN MUNICH
  // ============================================
  'bayern': 'bayern munich',
  'fcbayern': 'bayern munich',
  'bavarians': 'bayern munich',
  
  // ============================================
  // BORUSSIA DORTMUND
  // ============================================
  'dortmund': 'borussia dortmund',
  'bvb': 'borussia dortmund',
  'borussen': 'borussia dortmund',
  
  // ============================================
  // ATLETICO MADRID
  // ============================================
  'atleti': 'atletico madrid',
  'atletico': 'atletico madrid',
  'atm': 'atletico madrid',
  'colchoneros': 'atletico madrid',
  
  // ============================================
  // NATIONAL TEAMS
  // ============================================
  
  // Brazil
  'brasil': 'brazil',
  'seleção': 'brazil',
  'selecao': 'brazil',
  'bra': 'brazil',
  
  // Argentina
  'arg': 'argentina',
  'albiceleste': 'argentina',
  
  // Germany
  'ger': 'germany',
  'die mannschaft': 'germany',
  'mannschaft': 'germany',
  
  // France
  'fra': 'france',
  'les bleus': 'france',
  'bleus': 'france',
  
  // England
  'eng': 'england',
  'three lions': 'england',
  
  // Spain
  'esp': 'spain',
  'la roja': 'spain',
  'roja': 'spain',
  
  // Portugal
  'por': 'portugal',
  'seleção das quinas': 'portugal',
  
  // Netherlands
  'holland': 'netherlands',
  'dutch': 'netherlands',
  'oranje': 'netherlands',
  'ned': 'netherlands',
  
  // Italy
  'ita': 'italy',
  'azzurri': 'italy',
  
  // Belgium
  'bel': 'belgium',
  'red devils': 'belgium',
  
  // ============================================
  // COMMON TYPOS
  // ============================================
  'barceloan': 'barcelona',
  'barcelon': 'barcelona',
  'mancester': 'manchester',
  'manchster': 'manchester',
  'bayren': 'bayern',
  'athletico': 'atletico',
  'athletico madrid': 'atletico madrid',
  'juventues': 'juventus',
  'totenham': 'tottenham',
  
  // ============================================
  // PLAYER NAMES (Optional)
  // ============================================
  'messi': 'lionel messi',
  'leo messi': 'lionel messi',
  'ronaldo': 'cristiano ronaldo',
  'cr7': 'cristiano ronaldo',
  'mbappe': 'kylian mbappe',
  'neymar': 'neymar jr',
  'haaland': 'erling haaland',
};

/**
 * Get the official name for a search term
 * @param {string} searchTerm - The user's search input
 * @returns {string} - The official name or original term
 */
function getOfficialName(searchTerm) {
  const normalized = searchTerm.toLowerCase().trim();
  return searchAliases[normalized] || searchTerm;
}

/**
 * Check if a term is an alias
 * @param {string} searchTerm
 * @returns {boolean}
 */
function isAlias(searchTerm) {
  const normalized = searchTerm.toLowerCase().trim();
  return searchAliases.hasOwnProperty(normalized);
}

module.exports = {
  searchAliases,
  getOfficialName,
  isAlias,
};