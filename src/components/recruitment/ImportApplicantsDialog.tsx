import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ParsedApplicant {
  first_name: string;
  last_name: string;
  email: string;
  major?: string;
  year?: string;
}

interface ImportApplicantsDialogProps {
  onImport: (applicants: ParsedApplicant[]) => Promise<{ success: number; failed: number }>;
}

export function ImportApplicantsDialog({ onImport }: ImportApplicantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedApplicant[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string): { data: ParsedApplicant[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return { data: [], errors: ['CSV file must have a header row and at least one data row'] };
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''));

    // Find column indices
    const firstNameIdx = headers.findIndex(
      (h) => h.includes('first') || h === 'firstname' || h === 'first_name'
    );
    const lastNameIdx = headers.findIndex(
      (h) => h.includes('last') || h === 'lastname' || h === 'last_name'
    );
    const emailIdx = headers.findIndex((h) => h.includes('email') || h === 'mail');
    const majorIdx = headers.findIndex(
      (h) => h.includes('major') || h.includes('field') || h.includes('study')
    );
    const yearIdx = headers.findIndex(
      (h) => h.includes('year') || h.includes('class') || h.includes('grade')
    );

    // Check for name column if first/last not found
    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full name' || h === 'fullname');

    const parseErrors: string[] = [];

    if (emailIdx === -1) {
      parseErrors.push(
        'Could not find an email column. Make sure your CSV has a column with "email" in the header.'
      );
    }

    if (firstNameIdx === -1 && lastNameIdx === -1 && nameIdx === -1) {
      parseErrors.push(
        'Could not find name columns. Make sure your CSV has "First Name" and "Last Name" columns, or a "Name" column.'
      );
    }

    if (parseErrors.length > 0) {
      return { data: [], errors: parseErrors };
    }

    const parsedApplicants: ParsedApplicant[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handling quoted values)
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

      let firstName = '';
      let lastName = '';

      if (nameIdx !== -1 && firstNameIdx === -1) {
        // Split full name
        const fullName = values[nameIdx] || '';
        const nameParts = fullName.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else {
        firstName = values[firstNameIdx] || '';
        lastName = values[lastNameIdx] || '';
      }

      const email = values[emailIdx] || '';

      if (!firstName || !email) {
        parseErrors.push(`Row ${i + 1}: Missing required fields (first name or email)`);
        continue;
      }

      // Basic email validation
      if (!email.includes('@')) {
        parseErrors.push(`Row ${i + 1}: Invalid email format "${email}"`);
        continue;
      }

      parsedApplicants.push({
        first_name: firstName,
        last_name: lastName,
        email: email,
        major: majorIdx !== -1 ? values[majorIdx] || undefined : undefined,
        year: yearIdx !== -1 ? values[yearIdx] || undefined : undefined,
      });
    }

    return { data: parsedApplicants, errors: parseErrors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors: parseErrors } = parseCSV(text);
      setParsedData(data);
      setErrors(parseErrors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    const result = await onImport(parsedData);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Applicants from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with applicant data. Required columns: First Name (or Name), Email.
            Optional: Last Name, Major, Year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-gold/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            {fileName ? (
              <p className="text-sm font-medium text-foreground">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              </>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
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

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Preview ({parsedData.length} applicant{parsedData.length !== 1 ? 's' : ''})
              </p>
              <ScrollArea className="h-48 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((applicant, i) => (
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
                      </TableRow>
                    ))}
                    {parsedData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          ...and {parsedData.length - 10} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleImport}
            disabled={loading || parsedData.length === 0}
          >
            {loading
              ? 'Importing...'
              : `Import ${parsedData.length} Applicant${parsedData.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
