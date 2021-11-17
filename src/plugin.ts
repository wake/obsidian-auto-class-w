import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { ClassMatchScope } from './enum';
import { AutoClassPluginSettings, ClassPath, ClassTag } from './interfaces';
import { migrate } from './migrations';
import { AutoClassPluginSettingsTab } from './settings/settings';
import { isClassGroup, isClassPath, isClassTag } from './util';

export class AutoClassPlugin extends Plugin {
  appliedClasses = new WeakMap<MarkdownView, string[]>();
  settings: AutoClassPluginSettings = DEFAULT_SETTINGS;

  async onload() {
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
    await migrate(this);

    this.addSettingTab(new AutoClassPluginSettingsTab(this.app, this));
    this.registerEvent(this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this)));
  }

  onunload() {
    this.removeAllClasses();
  }

  /**
   * Layout change event handler. Removes old classes
   * and applies new classes to the active view and
   * any linked panes.
   */
  handleLayoutChange(): void {
    const activeViews = this.getAllActiveViews();
    if (activeViews) {
      // Flatten groups into a single array
      const allClasses = this.settings.matches.flatMap((p) => (isClassGroup(p) ? p.members : p));

      // Remove and apply classes for each applicable view
      activeViews.forEach((view) => {
        this.removePreviousClasses(view);
        const viewTags = (this.app.metadataCache.getFileCache(view.file).tags || []).map((meta) => meta.tag);
        let matches: Array<ClassPath | ClassTag> = [];
        let container: Element;
        if (this.isPreivewMode(view)) {
          matches = allClasses.filter((pathOrTag) => {
            if (pathOrTag.scope === ClassMatchScope.Preview || pathOrTag.scope === ClassMatchScope.Both) {
              if (isClassPath(pathOrTag)) {
                return view.file.path.startsWith(pathOrTag.path);
              } else if (isClassTag(pathOrTag)) {
                return viewTags.includes(pathOrTag.tag);
              }
            }
          });
          container = this.getPreviewContainer(view);
        } else if (this.isEditMode(view)) {
          matches = allClasses.filter((pathOrTag) => {
            if (pathOrTag.scope === ClassMatchScope.Edit || pathOrTag.scope === ClassMatchScope.Both) {
              if (isClassPath(pathOrTag)) {
                return view.file.path.startsWith(pathOrTag.path);
              } else if (isClassTag(pathOrTag)) {
                return viewTags.includes(pathOrTag.tag);
              }
            }
          });
          container = this.getEditContainer(view);
        }
        const classes: string[] = matches.flatMap((match) => match.classes);
        this.applyClasses(classes, view, container);
      });
    }
  }

  /**
   * Save settings in plugin data
   */
  saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  /**
   * Get the active markdown view and any linked panes.
   */
  private getAllActiveViews(): MarkdownView[] | null {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      // Get any linked views
      let activeViews: MarkdownView[] = [activeView];
      const leafGroup = this.app.workspace.getGroupLeaves((activeView.leaf as any).group);
      if (leafGroup && leafGroup.length > 0) {
        activeViews = leafGroup
          .map((leaf) => leaf.view)
          .filter((view) => view instanceof MarkdownView) as MarkdownView[];
      }
      return activeViews;
    }
    return null;
  }

  /**
   * Returns true if a view is in preview mode
   */
  private isPreivewMode(view: MarkdownView): boolean {
    return view.getMode() === 'preview';
  }

  /**
   * Returns true if a view is in edit/source mode
   */
  private isEditMode(view: MarkdownView): boolean {
    return view.getMode() === 'source';
  }

  /**
   * Add classes to an html element and store the
   * applied classes along with a reference the view
   * they were added to for removal later.
   */
  private applyClasses(classes: string[], view: MarkdownView, container: Element): void {
    container.addClasses(classes);
    this.appliedClasses.set(view, classes);
  }

  /**
   * Given a view, remove any extra classes this plugin
   * has applied to that view.
   */
  private removePreviousClasses(view: MarkdownView): void {
    const previewContainer = this.getPreviewContainer(view);
    const editContainer = this.getEditContainer(view);
    const classes = this.appliedClasses.get(view);
    if (classes && previewContainer) {
      previewContainer.removeClasses(classes);
    }
    if (classes && editContainer) {
      editContainer.removeClasses(classes);
    }
    this.appliedClasses.delete(view);
  }

  /**
   * Remove all applied classes from all views
   */
  private removeAllClasses() {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    leaves.forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        const applied = this.appliedClasses.get(view);
        if (applied) {
          const previewContainer = this.getPreviewContainer(view);
          const editContainer = this.getEditContainer(view);
          if (previewContainer) {
            previewContainer.removeClasses(applied);
          }
          if (editContainer) {
            editContainer.removeClasses(applied);
          }
        }
      }
    });
  }

  /**
   * Get the element that preview classes are applied to
   */
  private getPreviewContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-preview-view');
  }

  /**
   * Get the element that edit/source classes are applied to
   */
  private getEditContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-source-view');
  }
}
