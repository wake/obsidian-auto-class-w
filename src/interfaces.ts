import { MarkdownView } from 'obsidian';
import { RuleScope as RuleScope, RuleTargetType } from './enum';

export type RuleScopeSetting = Record<RuleScope, boolean>;

export interface AutoClassPluginSettings {
  // TODO: Remove in v4.0.0
  matches?: Array<ClassPath | ClassTag | ClassGroup>;
  rules: Array<AutoClassRuleGroup | AutoClassRule>;
  version: string;
  usePathGlob: boolean;
}

export interface AutoClassRuleGroup {
  name: string;
  members: AutoClassRule[];
  collapsed: boolean;
}

export interface AutoClassRule {
  name: string;
  scope: RuleScopeSetting;
  classes: string[];
  target: string;
  targetType: RuleTargetType;
}

/**
 * @deprecated to be removed in v4
 */
export interface ClassGroup {
  name: string;
  members: Array<ClassPath | ClassTag>;
  collapsed: boolean;
}

/**
 * @deprecated to be removed in v4
 */
export interface ClassMatch {
  classes: string[];
  scope: RuleScope;
}

/**
 * @deprecated to be removed in v4
 */
export interface ClassPath extends ClassMatch {
  path: string;
}

/**
 * @deprecated to be removed in v4
 */
export interface ClassTag extends ClassMatch {
  tag: string;
}

export interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}
