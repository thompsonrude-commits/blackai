import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Download, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
}

interface ProjectViewerProps {
  projectName: string;
  structure: FileNode[];
  onClose?: () => void;
}

/**
 * ProjectViewer - Display and interact with multi-file projects
 * Like VSCode file explorer with code preview
 */
export default function ProjectViewer({ projectName, structure, onClose }: ProjectViewerProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [copied, setCopied] = useState(false);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderTree = (nodes: FileNode[], parentPath = '') => {
    return nodes.map((node, index) => {
      const fullPath = `${parentPath}/${node.name}`;
      const isExpanded = expandedFolders.has(fullPath);

      if (node.type === 'folder') {
        return (
          <div key={index} className="ml-0">
            <button
              onClick={() => toggleFolder(fullPath)}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#00ff88]/10 rounded-lg transition-all w-full text-left group"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-[#00ff88]" />
              ) : (
                <ChevronRight size={14} className="text-[#00ff88]/60" />
              )}
              <Folder size={16} className="text-yellow-400" />
              <span className="text-sm text-white font-medium">{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div className="ml-4 border-l border-[#00ff88]/20 pl-2">
                {renderTree(node.children, fullPath)}
              </div>
            )}
          </div>
        );
      }

      return (
        <button
          key={index}
          onClick={() => setSelectedFile(node)}
          className={`flex items-center gap-2 py-1.5 px-2 ml-6 hover:bg-[#00ff88]/10 rounded-lg transition-all w-full text-left ${
            selectedFile?.name === node.name ? 'bg-[#00ff88]/15' : ''
          }`}
        >
          <File size={14} className="text-[#00ff88]/70" />
          <span className="text-sm text-[#e0e0e0]">{node.name}</span>
          {node.language && (
            <span className="text-xs text-[#00ff88]/50 ml-auto">{node.language}</span>
          )}
        </button>
      );
    });
  };

  const copyFileContent = () => {
    if (selectedFile?.content) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadProject = () => {
    // Create a text file with all files and their content
    let projectText = `# ${projectName}\n\n`;
    
    const flattenFiles = (nodes: FileNode[], path = ''): string => {
      let text = '';
      nodes.forEach(node => {
        if (node.type === 'file' && node.content) {
          text += `## ${path}/${node.name}\n\`\`\`${node.language || 'text'}\n${node.content}\n\`\`\`\n\n`;
        } else if (node.type === 'folder' && node.children) {
          text += flattenFiles(node.children, `${path}/${node.name}`);
        }
      });
      return text;
    };

    projectText += flattenFiles(structure);

    const blob = new Blob([projectText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 rounded-2xl border border-[#00ff88]/30 bg-[#0a0a0a] overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0d0d0d] px-4 py-3 border-b border-[#00ff88]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Folder size={18} className="text-[#00ff88]" />
          <span className="text-white font-semibold">{projectName}</span>
          <span className="text-[#00ff88]/60 text-xs px-2 py-1 bg-[#00ff88]/10 rounded-full">Project</span>
        </div>
        <button
          onClick={downloadProject}
          className="px-3 py-1.5 bg-[#00ff88]/20 text-[#00ff88] rounded-lg text-xs font-semibold hover:bg-[#00ff88]/30 transition-all flex items-center gap-2"
        >
          <Download size={14} />
          Download All
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        {/* File Tree */}
        <div className="md:col-span-1 border-r border-[#00ff88]/20 p-4 overflow-y-auto bg-[#0d0d0d]/50">
          <div className="text-xs text-[#00ff88]/50 uppercase font-semibold mb-3 tracking-wide">
            Project Structure
          </div>
          {renderTree(structure)}
        </div>

        {/* File Content */}
        <div className="md:col-span-2 p-4 overflow-y-auto">
          {selectedFile ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-[#00ff88]" />
                  <span className="text-white font-semibold">{selectedFile.name}</span>
                  {selectedFile.language && (
                    <span className="text-xs text-[#00ff88]/60 px-2 py-0.5 bg-[#00ff88]/10 rounded-full">
                      {selectedFile.language}
                    </span>
                  )}
                </div>
                <button
                  onClick={copyFileContent}
                  className="px-3 py-1.5 bg-[#00ff88]/20 text-[#00ff88] rounded-lg text-xs font-semibold hover:bg-[#00ff88]/30 transition-all flex items-center gap-2"
                >
                  {copied ? '✓ Copied' : <><Copy size={14} /> Copy</>}
                </button>
              </div>

              <pre className="bg-[#000000]/50 p-4 rounded-xl overflow-x-auto">
                <code className="text-[#e0e0e0] text-sm font-mono leading-relaxed">
                  {selectedFile.content}
                </code>
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <File size={48} className="text-[#00ff88]/30 mb-4" />
              <p className="text-[#e0e0e0] text-lg font-medium mb-2">
                Select a file to view
              </p>
              <p className="text-[#00ff88]/50 text-sm">
                Click on any file in the tree to see its content
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
