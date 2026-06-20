import type { Platform, Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';
import { LeetCodePlatform } from './leetcode';
import { GFGPlatform } from './gfg';
import { CodeforcesPlatform } from './codeforces';
import { CodeChefPlatform } from './codechef';
import { AtCoderPlatform } from './atcoder';
import { HackerRankPlatform } from './hackerrank';
import { CodingNinjasPlatform } from './coding-ninjas';
import { InterviewBitPlatform } from './interviewbit';
import { CSESPlatform } from './cses';
import { SPOJPlatform } from './spoj';
import { GenericPlatform } from './generic';

const PLATFORMS: BasePlatform[] = [
  new LeetCodePlatform(),
  new GFGPlatform(),
  new CodeforcesPlatform(),
  new CodeChefPlatform(),
  new AtCoderPlatform(),
  new HackerRankPlatform(),
  new CodingNinjasPlatform(),
  new InterviewBitPlatform(),
  new CSESPlatform(),
  new SPOJPlatform(),
];

const GENERIC = new GenericPlatform();

export class PlatformDetector {
  private currentPlatform: BasePlatform | null = null;

  detect(url?: string): BasePlatform {
    const targetUrl = url ?? window.location.href;

    for (const platform of PLATFORMS) {
      if (platform.matches(targetUrl)) {
        this.currentPlatform = platform;
        return platform;
      }
    }

    this.currentPlatform = GENERIC;
    return GENERIC;
  }

  getCurrentPlatform(): BasePlatform {
    return this.currentPlatform ?? this.detect();
  }

  getPlatformId(url?: string): Platform {
    return this.detect(url).platform;
  }

  extractAll(): {
    problem: Problem | null;
    code: UserCode | null;
    submission: SubmissionResult | null;
    platform: Platform;
  } {
    const platform = this.detect();
    return {
      problem: platform.extractProblem(),
      code: platform.extractUserCode(),
      submission: platform.extractSubmissionResult(),
      platform: platform.platform,
    };
  }

  registerPlatform(platform: BasePlatform): void {
    PLATFORMS.unshift(platform);
  }
}

export const platformDetector = new PlatformDetector();
