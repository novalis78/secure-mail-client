"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const Header_1 = __importDefault(require("./components/layout/Header"));
const Sidebar_1 = __importDefault(require("./components/layout/Sidebar"));
const MailList_1 = __importDefault(require("./components/mail/MailList"));
const ComposeEmail_1 = __importDefault(require("./components/mail/ComposeEmail"));
function App() {
    const [activePath, setActivePath] = (0, react_1.useState)('all');
    const [selectedMailId, setSelectedMailId] = (0, react_1.useState)(null);
    return (<div className="h-screen flex flex-col bg-base-dark text-white">
      <Header_1.default />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar_1.default activePath={activePath} setActivePath={setActivePath}/>
        
        {/* Email List Panel */}
        <div className="w-mail-list border-r border-border-dark">
          <MailList_1.default selectedMailId={selectedMailId} onSelectMail={setSelectedMailId}/>
        </div>

        {/* Main Content Panel */}
        <main className="flex-1 bg-base-dark">
          <ComposeEmail_1.default />
        </main>
      </div>
    </div>);
}
exports.default = App;
//# sourceMappingURL=App.js.map