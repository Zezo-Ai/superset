/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { render, screen, userEvent } from 'spec/helpers/testing-library';
import { QueryFormData } from '@superset-ui/core';
import { AlteredSliceTag } from '.';
import { defaultProps, expectedDiffs } from './AlteredSliceTagMocks';

test('renders the "Altered" label', () => {
  render(
    <AlteredSliceTag
      origFormData={defaultProps.origFormData}
      currentFormData={defaultProps.currentFormData}
      diffs={expectedDiffs}
    />,
  );

  const alteredLabel: HTMLElement = screen.getByText('Altered');
  expect(alteredLabel).toBeInTheDocument();
});

test('opens the modal on click', () => {
  render(
    <AlteredSliceTag
      origFormData={defaultProps.origFormData}
      currentFormData={defaultProps.currentFormData}
      diffs={expectedDiffs}
    />,
  );

  const alteredLabel: HTMLElement = screen.getByText('Altered');
  userEvent.click(alteredLabel);

  const modalTitle: HTMLElement = screen.getByText('Chart changes');

  expect(modalTitle).toBeInTheDocument();
});

test('displays the differences in the modal', () => {
  render(
    <AlteredSliceTag
      origFormData={defaultProps.origFormData}
      currentFormData={defaultProps.currentFormData}
      diffs={expectedDiffs}
    />,
  );

  const alteredLabel: HTMLElement = screen.getByText('Altered');
  userEvent.click(alteredLabel);

  const beforeValue: HTMLElement = screen.getByText('1, 2, 3, 4');
  const afterValue: HTMLElement = screen.getByText('a, b, c, d');

  expect(beforeValue).toBeInTheDocument();
  expect(afterValue).toBeInTheDocument();
});

test('does not render anything if there are no differences', () => {
  render(
    <AlteredSliceTag
      origFormData={defaultProps.origFormData}
      currentFormData={defaultProps.origFormData}
      diffs={{}}
    />,
  );

  const alteredLabel: HTMLElement | null = screen.queryByText('Altered');

  expect(alteredLabel).not.toBeInTheDocument();
});

test('does not render the altered label if diffs is empty', () => {
  render(
    <AlteredSliceTag
      origFormData={{ viz_type: 'altered_slice_tag_spec' } as QueryFormData}
      currentFormData={{ viz_type: 'altered_slice_tag_spec' } as QueryFormData}
      diffs={{}}
    />,
  );

  expect(screen.queryByText('Altered')).not.toBeInTheDocument();
});
