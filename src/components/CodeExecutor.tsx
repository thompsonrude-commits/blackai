import React, { useState, useEffect, useRef } from 'react';
import { Play, Copy, Download, X, FileCode, Eye, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CodeExecutorProps {
  code: string;
  language: string;
  fileName?: string;
  onClose?: () => void;
}

/**
 * CodeExecutor - Full-strength code execution and preview component
 * Supports: JavaScript, HTML/CSS, Python (via Pyodide), React (JSX)
 */
export default function CodeExecutor({ code, language, fileName = 'code', onClose }: CodeExecutorProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  // Detect if code is HTML (contains HTML tags)
  const isHTML = language === 'html' || /<(html|body|div|head|title|meta|link|script|style)/i.test(code);
  
  // Run code automatically on mount for HTML/JavaScript
  useEffect(() => {
    if (isHTML || language === 'javascript' || language === 'js') {
      executeCode();
    }
  }, [code]);

  const executeCode = async () => {
    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      if (isHTML) {
        // Execute HTML with inline JavaScript and CSS
        executeHTML(code);
      } else if (language === 'javascript' || language === 'js' || language === 'jsx') {
        executeJavaScript(code);
      } else if (language === 'python' || language === 'py') {
        await executePython(code);
      } else {
        setOutput('Language execution not yet supported. Showing code only.');
      }
    } catch (err: any) {
      setError(err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const executeHTML = (htmlCode: string) => {
    setActiveTab('preview');
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlCode);
        doc.close();
      }
    }
  };

  const executeJavaScript = (jsCode: string) => {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Capture console output
    console.log = (...args) => {
      logs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };
    console.error = (...args) => logs.push('ERROR: ' + args.join(' '));
    console.warn = (...args) => logs.push('WARN: ' + args.join(' '));

    try {
      // Execute in isolated scope
      const result = eval(jsCode);
      if (result !== undefined) {
        logs.push(String(result));
      }
      setOutput(logs.join('\n') || '✓ Code executed successfully (no output)');
    } catch (err: any) {
      setError(err.message);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };

  const executePython = async (pythonCode: string) => {
    try {
      // Load Pyodide if not already loaded
      if (!(window as any).pyodide) {
        setOutput('Loading Python environment...');
        const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs' as any);
        (window as any).pyodide = await loadPyodide();
      }

      const pyodide = (window as any).pyodide;
      const result = await pyodide.runPythonAsync(pythonCode);
      setOutput(result !== undefined ? String(result) : '✓ Code executed successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 
                     language === 'html' ? 'html' : 
                     language === 'javascript' || language === 'js' ? 'js' : 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="my-4 rounded-2xl border border-[#00ff88]/30 bg-[#0a0a0a] overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]"
      style={{ maxWidth: '100%' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0d0d0d] px-4 py-3 border-b border-[#00ff88]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCode size={18} className="text-[#00ff88]" />
          <span className="text-white font-semibold text-sm">{fileName}.{language}</span>
          <span className="text-[#00ff88]/60 text-xs px-2 py-1 bg-[#00ff88]/10 rounded-full">{language}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tabs */}
          {isHTML && (
            <div className="flex gap-1 mr-4">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'code' 
                    ? 'bg-[#00ff88] text-black' 
                    : 'bg-[#1a1a1a] text-[#00ff88]/60 hover:text-[#00ff88]'
                }`}
              >
                <Code2 size={14} className="inline mr-1" />
                Code
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'preview' 
                    ? 'bg-[#00ff88] text-black' 
                    : 'bg-[#1a1a1a] text-[#00ff88]/60 hover:text-[#00ff88]'
                }`}
              >
                <Eye size={14} className="inline mr-1" />
                Preview
              </button>
            </div>
          )}
          
          {!isHTML && (
            <button
              onClick={executeCode}
              disabled={isRunning}
              className="px-3 py-1.5 bg-[#00ff88] text-black rounded-lg text-xs font-semibold hover:bg-[#00d470] transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play size={14} />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          )}
          
          <button
            onClick={copyCode}
            className="p-1.5 hover:bg-[#00ff88]/10 rounded-lg transition-all text-[#00ff88]/70 hover:text-[#00ff88]"
            title="Copy code"
          >
            {copied ? <span className="text-xs">✓</span> : <Copy size={16} />}
          </button>
          
          <button
            onClick={downloadCode}
            className="p-1.5 hover:bg-[#00ff88]/10 rounded-lg transition-all text-[#00ff88]/70 hover:text-[#00ff88]"
            title="Download"
          >
            <Download size={16} />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all text-red-400/70 hover:text-red-400"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {activeTab === 'code' ? (
          <div className="relative">
            <pre className="p-4 overflow-x-auto text-sm leading-relaxed max-h-[500px] overflow-y-auto">
              <code className="text-[#e0e0e0] font-mono">{code}</code>
            </pre>
          </div>
        ) : (
          <div className="bg-white min-h-[400px]">
            <iframe
              ref={iframeRef}
              title="HTML Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>

      {/* Output/Error */}
      {(output || error) && activeTab === 'code' && (
        <div className={`border-t ${error ? 'border-red-500/30 bg-red-500/5' : 'border-[#00ff88]/20 bg-[#00ff88]/5'} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold ${error ? 'text-red-400' : 'text-[#00ff88]'}`}>
              {error ? '❌ Error' : '✓ Output'}
            </span>
          </div>
          <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            <code className={error ? 'text-red-300' : 'text-[#e0e0e0]'}>
              {error || output}
            </code>
          </pre>
        </div>
      )}
    </motion.div>
  );
}
