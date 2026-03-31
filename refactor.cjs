const fs = require('fs');
const files = [
  'src/App.jsx',
  'src/components/MiningDashboard.jsx',
  'src/components/MineAuthGate.jsx',
  'src/components/Navbar.jsx',
  'src/components/CarbonSinkModule.jsx'
];

const emojiMap = {
  '🍃': '<FaLeaf />', '📊': '<FaChartBar />', '🌿': '<FaSeedling />', '🌍': '<FaGlobe />', '📝': '<FaRegEdit />',
  '🎛️': '<FaSlidersH />', '💰': '<FaCoins />', '🔥': '<FaFire />', '👥': '<FaUsers />', '🌲': '<FaTree />',
  '⚖️': '<FaBalanceScale />', '🏆': '<FaTrophy />', '✅': '<FaCheckCircle />', '⚠️': '<FaExclamationTriangle />',
  '🏭': '<FaIndustry />', '♻️': '<FaRecycle />', '📉': '<FaChartLine />', '⛽': '<FaGasPump />', '⚡': '<FaBolt />',
  '💨': '<FaWind />', '💥': '<FaBomb />', '🎉': '<FaAward />', '⏳': '<FaHourglassHalf />', '🔄': '<FaSyncAlt />',
  '❌': '<FaTimesCircle />', '📭': '<FaInbox />', '📅': '<FaCalendarDay />', '📆': '<FaCalendarAlt />',
  '🗓️': '<FaCalendar />', '🍩': '<FaChartPie />', '📈': '<FaChartLine />', '🗄️': '<FaArchive />',
  '⛏️': '<FaHammer />', '🔑': '<FaKey />', '🆕': '<FaPlusCircle />', '💰': '<FaCoins />'
};

const usedInFile = {};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Specific text replacements for strings/alerts
  let strReplacements = {
    '✅': '', '❌': '', '🔄': '', '⏳': '', '⚠️': '', '🎉': ''
  };

  // Step 1: Replace inside template literal `alert(...)`, `setError(...)`, `setInfo(...)`, `sub=...`
  // We'll just replace '✅ ' with '' generically if it's inside quotes or backticks.
  // The easiest way is to let the DOM take the <FaIcon />, but for text we must strip them.
  content = content.replace(/['"`][^'"`]*[✅❌🔄⏳⚠️🎉][^'"`]*['"`]/g, match => {
    let replaced = match;
    for (let e in strReplacements) replaced = replaced.replace(new RegExp(e, 'g'), '');
    return replaced;
  });

  // Collect explicitly used icons
  let importedIcons = new Set();

  for (const [emoji, iconString] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) {
      const match = iconString.match(/<([A-Za-z0-9_]+) \/>/);
      if (match) importedIcons.add(match[1]);
      
      // Special cases where emoji is passed as a string prop:
      // icon="📊" => icon={<FaChartBar />}
      // We will replace icon="EMOJI" with icon={<FaIcon />}
      const propRegex = new RegExp(`icon="${emoji}"`, 'g');
      content = content.replace(propRegex, `icon={${iconString}}`);
      
      // Also text nodes
      const nodeRegex = new RegExp(emoji, 'g');
      content = content.replace(nodeRegex, iconString);
    }
  }

  // Remove comments
  // Removing JSX comments
  content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  // Removing JS block comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Removing JS line comments that are not URLs
  content = content.replace(/(?:^|\s+)\/\/.(?!(\/?(?:https?:\/\/))).*$/gm, '');

  // Inject import at the top if icons were used
  if (importedIcons.size > 0) {
    const iconList = Array.from(importedIcons).join(', ');
    const importStmt = `import { ${iconList} } from "react-icons/fa";\n`;
    
    // insert right after the last import statement
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
    } else {
      content = importStmt + content;
    }
  }

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Refactor complete!');
