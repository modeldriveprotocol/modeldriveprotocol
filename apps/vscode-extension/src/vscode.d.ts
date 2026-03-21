declare module 'vscode' {
  export type Thenable<T> = PromiseLike<T>
  export type GlobPattern = string

  export interface Disposable {
    dispose(): unknown
  }

  export interface Position {
    readonly line: number
    readonly character: number
  }

  export interface Range {
    readonly start: Position
    readonly end: Position
    readonly isEmpty: boolean
  }

  export interface Selection extends Range {}

  export interface Uri {
    readonly fsPath: string
    readonly path: string
    readonly scheme: string
    toString(skipEncoding?: boolean): string
  }

  export namespace Uri {
    function parse(value: string): Uri
    function file(path: string): Uri
  }

  export interface TextDocument {
    readonly uri: Uri
    readonly fileName: string
    readonly languageId: string
    readonly version: number
    readonly isDirty: boolean
    readonly lineCount: number
    getText(range?: Range): string
  }

  export interface TextEditor {
    readonly document: TextDocument
    readonly selection: Selection
  }

  export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
  }

  export interface Diagnostic {
    readonly range: Range
    readonly message: string
    readonly severity: DiagnosticSeverity
    readonly source?: string
    readonly code?: string | number | { value: string | number }
  }

  export interface WorkspaceFolder {
    readonly uri: Uri
    readonly name: string
    readonly index: number
  }

  export interface WorkspaceConfiguration {
    get<T>(section: string): T | undefined
    get<T>(section: string, defaultValue: T): T
  }

  export interface TextSearchQuery {
    pattern: string
    isCaseSensitive?: boolean
    isRegExp?: boolean
    isWordMatch?: boolean
  }

  export interface TextSearchPreviewOptions {
    matchLines: number
    charsPerLine: number
  }

  export interface FindTextInFilesOptions {
    include?: GlobPattern
    exclude?: GlobPattern
    maxResults?: number
    useIgnoreFiles?: boolean
    useGlobalIgnoreFiles?: boolean
    useParentIgnoreFiles?: boolean
    followSymlinks?: boolean
    previewOptions?: TextSearchPreviewOptions
  }

  export interface TextSearchPreviewInfo {
    text: string
    matches: Range | readonly Range[]
  }

  export interface TextSearchMatch {
    readonly uri: Uri
    readonly ranges: Range | readonly Range[]
    readonly preview: TextSearchPreviewInfo
  }

  export interface TextSearchContext {
    readonly uri: Uri
    readonly text: string
    readonly lineNumber: number
  }

  export type TextSearchResult = TextSearchMatch | TextSearchContext

  export interface TextSearchComplete {
    readonly limitHit?: boolean
  }

  export interface ConfigurationChangeEvent {
    affectsConfiguration(section: string): boolean
  }

  export enum StatusBarAlignment {
    Left = 1,
    Right = 2
  }

  export interface StatusBarItem extends Disposable {
    text: string
    tooltip?: string
    command?: string
    show(): void
    hide(): void
  }

  export interface OutputChannel extends Disposable {
    appendLine(value: string): void
    show(preserveFocus?: boolean): void
  }

  export interface Extension<T = unknown> {
    readonly id: string
    readonly packageJSON: T
  }

  export interface ExtensionContext {
    readonly extension: Extension
    readonly subscriptions: {
      push(...items: Disposable[]): number
    }
  }

  export namespace commands {
    function registerCommand(
      command: string,
      callback: (...args: unknown[]) => unknown
    ): Disposable
    function executeCommand<T = unknown>(
      command: string,
      ...rest: unknown[]
    ): Thenable<T>
  }

  export namespace workspace {
    const workspaceFolders: readonly WorkspaceFolder[] | undefined
    function getConfiguration(section?: string): WorkspaceConfiguration
    function onDidChangeConfiguration(
      listener: (event: ConfigurationChangeEvent) => unknown
    ): Disposable
    function findFiles(
      include: GlobPattern,
      exclude?: GlobPattern | null,
      maxResults?: number
    ): Thenable<Uri[]>
    function findTextInFiles(
      query: TextSearchQuery,
      options: FindTextInFilesOptions,
      callback: (result: TextSearchResult) => void
    ): Thenable<TextSearchComplete>
    function openTextDocument(uri: Uri | string): Thenable<TextDocument>
    function asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string
  }

  export namespace languages {
    function getDiagnostics(uri: Uri): Diagnostic[]
    function getDiagnostics(): [Uri, Diagnostic[]][]
  }

  export namespace window {
    const activeTextEditor: TextEditor | undefined
    function createOutputChannel(name: string): OutputChannel
    function createStatusBarItem(alignment?: StatusBarAlignment): StatusBarItem
    function showInformationMessage(message: string): Thenable<string | undefined>
    function showErrorMessage(message: string): Thenable<string | undefined>
  }

  export namespace env {
    const machineId: string
    const appName: string
  }

  export const version: string
}
