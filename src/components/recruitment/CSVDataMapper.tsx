import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ParsedApplicant {
  first_name: string;
  last_name: string;
  email: string;
  major?: string;
  year?: string;
  gpa?: number;
  metadata: Record<string, string>;
}

interface CSVDataMapperProps {
  onImport: (
    applicants: ParsedApplicant[]
  ) => Promise<{ success: number; failed: number }>;
}

const REQUIRED_FIELDS = ['first_name', 'last_name', 'email'] as const;
const OPTIONAL_FIELDS = ['major', 'year', 'gpa'] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

type FieldName = (typeof ALL_FIELDS)[number];

interface ColumnMapping {
  csvHeader: string;
  mappedTo: FieldName | 'metadata' | 'skip';
  autoDetected: boolean;
  wasModified: boolean;
}

export function CSVDataMapper({ onImport }: CSVDataMapperProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedData, setParsedData] = useState<ParsedApplicant[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(
    null
  );
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings([]);
    setParsedData([]);
    setErrors([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        setErrors(['CSV must have a header row and at least one data row']);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => parseCSVLine(line));

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-detect mappings with enhanced Google Form pattern recognition
      const autoMappings: ColumnMapping[] = headers.map((header) => {
        const lowerHeader = header.toLowerCase();
        // Normalize: remove question marks, extra spaces, "your", "what is", "please enter"
        const normalized = lowerHeader
          .replace(/[?.,!]/g, '')
          .replace(/\b(what is|what's|please enter|please provide|your)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        let mappedTo: FieldName | 'metadata' | 'skip' = 'metadata';

        // Skip timestamp columns (common in Google Forms)
        if (lowerHeader.includes('timestamp') || lowerHeader === 'submitted at' || lowerHeader === 'response id') {
          mappedTo = 'skip';
        }
        // First name patterns
        else if (
          normalized.includes('first name') ||
          normalized === 'first' ||
          normalized === 'firstname' ||
          normalized === 'given name' ||
          normalized === 'name first'
        ) {
          mappedTo = 'first_name';
        }
        // Last name patterns
        else if (
          normalized.includes('last name') ||
          normalized === 'last' ||
          normalized === 'lastname' ||
          normalized === 'surname' ||
          normalized === 'family name' ||
          normalized === 'name last'
        ) {
          mappedTo = 'last_name';
        }
        // Email patterns
        else if (
          normalized.includes('email') ||
          normalized.includes('e-mail') ||
          normalized.includes('mail address') ||
          normalized === 'mail'
        ) {
          mappedTo = 'email';
        }
        // Major/field of study patterns
        else if (
          normalized.includes('major') ||
          normalized.includes('field of study') ||
          normalized.includes('area of study') ||
          normalized.includes('concentration') ||
          normalized.includes('program of study') ||
          normalized.includes('degree program')
        ) {
          mappedTo = 'major';
        }
        // Year/class patterns
        else if (
          normalized.includes('class year') ||
          normalized.includes('graduation year') ||
          normalized.includes('expected graduation') ||
          normalized.includes('class of') ||
          normalized === 'year' ||
          normalized === 'class' ||
          normalized === 'grade level' ||
          normalized === 'academic year' ||
          /\b(freshman|sophomore|junior|senior)\b/.test(normalized)
        ) {
          mappedTo = 'year';
        }
        // GPA patterns
        else if (
          normalized.includes('gpa') ||
          normalized.includes('grade point') ||
          normalized.includes('cumulative gpa')
        ) {
          mappedTo = 'gpa';
        }

        const autoDetected = mappedTo !== 'metadata';
        return { csvHeader: header, mappedTo, autoDetected, wasModified: false };
      });

      setMappings(autoMappings);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const updateMapping = (index: number, mappedTo: FieldName | 'metadata' | 'skip') => {
        setMappings((prev) =>
          prev.map((m, i) => (i === index ? { ...m, mappedTo, wasModified: true } : m))
        );
  };

  const validateMappings = (): boolean => {
    const mapped = mappings.filter((m) => m.mappedTo !== 'skip' && m.mappedTo !== 'metadata');
    const mappedFields = mapped.map((m) => m.mappedTo);

    for (const required of REQUIRED_FIELDS) {
      if (!mappedFields.includes(required)) {
        setErrors([`Missing required field: ${required.replace('_', ' ')}`]);
        return false;
      }
    }

    // Check for duplicates
    const seen = new Set<string>();
    for (const field of mappedFields) {
      if (seen.has(field)) {
        setErrors([`Duplicate mapping for: ${field.replace('_', ' ')}`]);
        return false;
      }
      seen.add(field);
    }

    setErrors([]);
    return true;
  };

  const processData = () => {
    if (!validateMappings()) return;

    const parseErrors: string[] = [];
    const applicants: ParsedApplicant[] = [];

    csvRows.forEach((row, rowIndex) => {
      const applicant: ParsedApplicant = {
        first_name: '',
        last_name: '',
        email: '',
        metadata: {},
      };

      mappings.forEach((mapping, colIndex) => {
        const value = row[colIndex] || '';

        if (mapping.mappedTo === 'skip') return;

        if (mapping.mappedTo === 'metadata') {
          if (value.trim()) {
            applicant.metadata[mapping.csvHeader] = value;
          }
        } else if (mapping.mappedTo === 'gpa') {
          const gpa = parseFloat(value);
          if (!isNaN(gpa)) {
            applicant.gpa = gpa;
          }
        } else if (mapping.mappedTo === 'first_name') {
          applicant.first_name = value;
        } else if (mapping.mappedTo === 'last_name') {
          applicant.last_name = value;
        } else if (mapping.mappedTo === 'email') {
          applicant.email = value;
        } else if (mapping.mappedTo === 'major') {
          applicant.major = value;
        } else if (mapping.mappedTo === 'year') {
          applicant.year = value;
        }
      });

      // Validate required fields
      if (!applicant.first_name) {
        parseErrors.push(`Row ${rowIndex + 2}: Missing first name`);
        return;
      }
      if (!applicant.email || !applicant.email.includes('@')) {
        parseErrors.push(`Row ${rowIndex + 2}: Invalid or missing email`);
        return;
      }

      applicants.push(applicant);
    });

    if (parseErrors.length > 0) {
      setErrors(parseErrors.slice(0, 5));
      if (parseErrors.length > 5) {
        setErrors((prev) => [...prev, `...and ${parseErrors.length - 5} more errors`]);
      }
    }

    setParsedData(applicants);
    setStep('preview');
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setStep('importing');
    setLoading(true);
    setImportProgress(0);

    // Simulate progress (actual import happens in batch)
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    const result = await onImport(parsedData);

    clearInterval(progressInterval);
    setImportProgress(100);
    setImportResult(result);
    setLoading(false);

    if (result.failed === 0) {
      setTimeout(() => {
        setOpen(false);
        resetState();
      }, 1500);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  };

  const getMappingBadgeVariant = (mappedTo: string) => {
    if (REQUIRED_FIELDS.includes(mappedTo as (typeof REQUIRED_FIELDS)[number])) {
      return 'default';
    }
    if (OPTIONAL_FIELDS.includes(mappedTo as (typeof OPTIONAL_FIELDS)[number])) {
      return 'secondary';
    }
    if (mappedTo === 'metadata') {
      return 'outline';
    }
    return 'secondary';
  };

  const metadataFieldCount = mappings.filter((m) => m.mappedTo === 'metadata').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Smart Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import Applicants from CSV'}
            {step === 'mapping' && 'Map CSV Columns'}
            {step === 'preview' && 'Preview Import'}
            {step === 'importing' && 'Importing...'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a Google Form export or any CSV file with applicant data.'}
            {step === 'mapping' &&
              'Map your CSV columns to applicant fields. Extra columns will be stored as metadata.'}
            {step === 'preview' && `Ready to import ${parsedData.length} applicants.`}
            {step === 'importing' && 'Please wait while we import your applicants...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                {fileName ? (
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Works with Google Forms exports
                    </p>
                  </>
                )}
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mapping.csvHeader}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Sample: {csvRows[0]?.[index] || '(empty)'}
                        </p>
                      </div>

                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                      <Select
                        value={mapping.mappedTo}
                        onValueChange={(value) =>
                          updateMapping(index, value as FieldName | 'metadata' | 'skip')
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">
                            <span className="text-muted-foreground">Skip</span>
                          </SelectItem>
                          <SelectItem value="first_name">First Name *</SelectItem>
                          <SelectItem value="last_name">Last Name *</SelectItem>
                          <SelectItem value="email">Email *</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                          <SelectItem value="gpa">GPA</SelectItem>
                          <SelectItem value="metadata">
                            <span className="text-gold">→ Metadata</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {mapping.wasModified ? (
                          <Badge variant="outline" className="text-xs gap-1 border-muted-foreground/30">
                            <Pencil className="w-3 h-3" />
                            Manual
                          </Badge>
                        ) : mapping.autoDetected ? (
                          <Badge variant="secondary" className="text-xs gap-1 bg-gold/10 text-gold border-gold/20">
                            <Sparkles className="w-3 h-3" />
                            Auto
                          </Badge>
                        ) : null}
                        <Badge variant={getMappingBadgeVariant(mapping.mappedTo)} className="shrink-0">
                          {mapping.mappedTo === 'metadata' ? 'Extra' : mapping.mappedTo === 'skip' ? '—' : '✓'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {metadataFieldCount > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-gold" />
                  <AlertDescription>
                    {metadataFieldCount} column{metadataFieldCount !== 1 ? 's' : ''} will be stored as
                    metadata (e.g., form responses like "Why do you want to join?")
                  </AlertDescription>
                </Alert>
              )}

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors[0]}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 15).map((applicant, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {applicant.first_name} {applicant.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{applicant.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {applicant.major || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {applicant.year || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {applicant.gpa?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell>
                          {Object.keys(applicant.metadata).length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {Object.keys(applicant.metadata).length} fields
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedData.length > 15 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ...and {parsedData.length - 15} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="space-y-6 py-8">
              <div className="space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {importProgress < 100 ? 'Importing applicants...' : 'Complete!'}
                </p>
              </div>

              {importResult && (
                <Alert variant={importResult.failed === 0 ? 'default' : 'destructive'}>
                  {importResult.failed === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    Successfully imported {importResult.success} applicant
                    {importResult.success !== 1 ? 's' : ''}.
                    {importResult.failed > 0 && ` ${importResult.failed} failed.`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button variant="gold" onClick={processData}>
                Continue to Preview
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button
                variant="gold"
                onClick={handleImport}
                disabled={loading || parsedData.length === 0}
              >
                Import {parsedData.length} Applicant{parsedData.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}

          {step === 'importing' && importResult && importResult.failed > 0 && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
