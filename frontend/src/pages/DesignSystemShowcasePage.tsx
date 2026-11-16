import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Download,
  Share2,
  Copy,
  FolderOpen,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";

import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  Badge,
  Tooltip,
  Dialog,
  DropdownMenu,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Spinner,
  EmptyState,
  ErrorState,
  ToastProvider,
  useToast,
} from "@/components/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/features/theme/ThemeContext";

function ShowcaseContent() {
  const toast = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [checkbox3, setCheckbox3] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("Key syllabus points for Thermodynamics Exam:\n- Carnot Cycle\n- Entropy Calculations\n- Enthalpy Relations");

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-12 space-y-12 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
            <Sparkles size={11} />
            <span>Design System — Phase 2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">The Academic Monolith</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standardized primitive components and centralized token system for AI Academic Assistant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            size="sm"
            variant="lime"
            onClick={() => toast.success("Toast Notification Active", "Design system primitives verified successfully.")}
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      {/* ─── 1. Typography Scale ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Typography Scale</h2>
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Display (30px / 800)</span>
            <div className="text-3xl font-extrabold tracking-tight">Advanced Quantum Mechanics</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Page Heading (24px / 700)</span>
            <div className="text-2xl font-bold tracking-tight">Thermodynamic State Functions & Ideal Gases</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Section Heading (18px / 700)</span>
            <div className="text-lg font-bold tracking-tight">Lecture 04: The First Law of Thermodynamics</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Body Text (13px / 400 / Leading-relaxed)</span>
            <p className="text-xs text-foreground/90 leading-relaxed max-w-2xl">
              An adiabatic process occurs without transfer of heat or mass of substances between a thermodynamic system and its surroundings. In an adiabatic process, energy is transferred to the surroundings only as work.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Monospace Code & Mathematical Formula</span>
            <pre className="text-xs font-mono bg-muted/60 p-3 rounded-lg border border-border/60 text-foreground inline-block">
              {"ΔU = Q - W   where   Q = 0  =>  ΔU = -W"}
            </pre>
          </div>
        </Card>
      </section>

      {/* ─── 2. Buttons & IconButtons ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Buttons & Icon Buttons</h2>
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Variants:</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Primary Default</Button>
              <Button variant="lime">Lime Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link Style</Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Sizes & States:</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="outline">Extra Small (xs)</Button>
              <Button size="sm" variant="outline">Small (sm)</Button>
              <Button size="default" variant="outline">Default (md)</Button>
              <Button size="lg" variant="outline">Large (lg)</Button>
              <Button size="default" isLoading>Loading State</Button>
              <Button size="default" disabled>Disabled State</Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Icon Buttons (with Mandatory ARIA Labels):</span>
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip content="Upload Course Document">
                <IconButton aria-label="Upload document" variant="default">
                  <Plus size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip content="Download Flashcard Deck">
                <IconButton aria-label="Download deck" variant="lime">
                  <Download size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip content="Copy Citations">
                <IconButton aria-label="Copy citations" variant="outline">
                  <Copy size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip content="Share Notebook">
                <IconButton aria-label="Share notebook" variant="ghost">
                  <Share2 size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip content="Delete Material">
                <IconButton aria-label="Delete material" variant="destructive">
                  <Trash2 size={15} />
                </IconButton>
              </Tooltip>

              <IconButton aria-label="Loading action" isLoading variant="outline" />
            </div>
          </div>
        </Card>
      </section>

      {/* ─── 3. Form Inputs & Selects ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3. Form Controls</h2>
        <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Course Notebook Title"
            placeholder="e.g. Organic Chemistry II"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            helperText="Assign a distinct title for this semester's study materials."
          />

          <Input
            label="Invalid Input Sample"
            defaultValue="invalid_email"
            error="Please enter a valid academic institutional email."
          />

          <Select
            label="Examination Type"
            defaultValue="50"
            helperText="Configures the question distribution and answer key."
          >
            <option value="25">Midterm Assessment (25 Marks)</option>
            <option value="50">Comprehensive Final (50 Marks)</option>
            <option value="100">Standard Board Exam (100 Marks)</option>
          </Select>

          <div className="space-y-2 pt-1">
            <span className="block text-xs font-semibold tracking-wide text-foreground/90 select-none">
              Source Selection
            </span>
            <div className="space-y-2.5">
              <Checkbox
                label="Physics_Chapter_04.pdf"
                description="8,420 words extracted"
                checked={checkbox1}
                onChange={(e) => setCheckbox1(e.target.checked)}
              />
              <Checkbox
                label="Lecture_Notes_Week_02.txt"
                description="3,150 words extracted"
                checked={checkbox2}
                onChange={(e) => setCheckbox2(e.target.checked)}
              />
              <Checkbox
                label="Supplementary_Formulas.docx"
                description="Indeterminate selection"
                indeterminate={true}
                checked={checkbox3}
                onChange={(e) => setCheckbox3(e.target.checked)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Study Focus & Topics"
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              maxLength={300}
              currentLength={textareaValue.length}
              helperText="Specify priority concepts or chapters for the AI generation studio."
            />
          </div>
        </Card>
      </section>

      {/* ─── 4. Badges, Tabs & Navigation Primitives ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">4. Badges & Tabs</h2>
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Badges (Academic Monolith):</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="lime">Lime Accent</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Completed (100%)</Badge>
              <Badge variant="warning">In Progress</Badge>
              <Badge variant="destructive">Failed</Badge>
              <Badge variant="sky">14 Sources</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Pills Tabs:</span>
            <Tabs defaultValue="guide" variant="pills">
              <TabsList aria-label="Study studio tabs">
                <TabsTrigger value="guide" badge={<Badge variant="lime" className="text-[8px] px-1 py-0 h-3.5">NEW</Badge>}>
                  Study Guide
                </TabsTrigger>
                <TabsTrigger value="flashcards" badge={<span className="text-[10px] text-muted-foreground font-mono">24</span>}>
                  Flashcards
                </TabsTrigger>
                <TabsTrigger value="exam">
                  Exam Simulation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="guide" className="p-4 rounded-xl bg-muted/30 border border-border/40 text-xs">
                Generated Markdown notes and structured formulas are presented here.
              </TabsContent>
              <TabsContent value="flashcards" className="p-4 rounded-xl bg-muted/30 border border-border/40 text-xs">
                Active recall flashcard deck with 3D flip animation.
              </TabsContent>
              <TabsContent value="exam" className="p-4 rounded-xl bg-muted/30 border border-border/40 text-xs">
                5-mark and 10-mark mock exam paper with collapsible answer key.
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Underline Tabs:</span>
            <Tabs defaultValue="sources" variant="underline">
              <TabsList aria-label="Workspace tabs">
                <TabsTrigger value="sources">Sources (3)</TabsTrigger>
                <TabsTrigger value="conversations">Chat History</TabsTrigger>
                <TabsTrigger value="settings">Parameters</TabsTrigger>
              </TabsList>
              <TabsContent value="sources" className="pt-3 text-xs text-muted-foreground">
                Document ingestion rail with word count and extraction status.
              </TabsContent>
              <TabsContent value="conversations" className="pt-3 text-xs text-muted-foreground">
                Persistent threaded chats with grounded citations.
              </TabsContent>
              <TabsContent value="settings" className="pt-3 text-xs text-muted-foreground">
                Model temperature and citation density controls.
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </section>

      {/* ─── 5. Dialog & Dropdown ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">5. Overlays (Dialog & Dropdown)</h2>
        <Card className="p-6 flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Open Accessible Dialog
          </Button>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Create Course Notebook"
            description="Organize your study sources, lecture slides, and AI revision materials under one course workspace."
          >
            <div className="space-y-4 pt-2">
              <Input label="Notebook Title" placeholder="e.g. Linear Algebra & Vector Calculus" autoFocus />
              <Textarea label="Course Description" placeholder="Semester syllabus, professor notes, and reference textbooks." rows={3} />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="lime" onClick={() => { setDialogOpen(false); toast.success("Notebook Created", "Linear Algebra workspace initialized."); }}>
                  Create Notebook
                </Button>
              </div>
            </div>
          </Dialog>

          <DropdownMenu
            trigger={
              <Button variant="outline" className="gap-2">
                <span>Actions Dropdown</span>
              </Button>
            }
            items={[
              { id: "export-pdf", label: "Export to PDF", icon: <Download size={13} />, shortcut: "⌘P", onClick: () => toast.info("Exporting PDF") },
              { id: "copy-link", label: "Copy Share Link", icon: <Share2 size={13} />, onClick: () => toast.success("Link copied to clipboard") },
              "separator",
              { id: "delete", label: "Delete Material", icon: <Trash2 size={13} />, destructive: true, onClick: () => toast.error("Material deleted") },
            ]}
          />
        </Card>
      </section>

      {/* ─── 6. Feedback, Loaders & States ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">6. Loaders & Feedback States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <span className="text-[11px] font-semibold text-muted-foreground block">Skeletons & Spinners:</span>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-10 w-10" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" className="h-3.5 w-3/4" />
                  <Skeleton variant="text" className="h-2.5 w-1/2" />
                </div>
              </div>
              <Skeleton variant="rect" className="h-20 w-full" />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner size="default" />
              <Spinner size="lg" color="lime" />
              <Spinner size="xl" color="muted" />
            </div>
          </Card>

          <div className="space-y-4">
            <ErrorState
              variant="banner"
              title="SSE Connection Interrupted"
              message="The streaming tutor response timed out."
              onRetry={() => toast.info("Retrying SSE generation...")}
            />

            <EmptyState
              variant="compact"
              title="No Study Materials Yet"
              description="Upload a syllabus or course PDF to generate study guides, flashcards, or exam papers."
              action={
                <Button size="xs" variant="lime">
                  <Plus size={12} className="mr-1" />
                  <span>Upload First Source</span>
                </Button>
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function DesignSystemShowcasePage() {
  return (
    <ToastProvider>
      <ShowcaseContent />
    </ToastProvider>
  );
}
