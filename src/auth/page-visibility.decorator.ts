import { SetMetadata } from '@nestjs/common';

export const PAGE_VISIBILITY_KEY = 'page_visibility_key';
export const PageVisibility = (key: string) => SetMetadata(PAGE_VISIBILITY_KEY, key);
