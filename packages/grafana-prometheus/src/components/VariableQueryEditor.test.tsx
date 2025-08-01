// Core Grafana history https://github.com/grafana/grafana/blob/v11.0.0-preview/public/app/plugins/datasource/prometheus/components/VariableQueryEditor.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

import { selectors } from '@grafana/e2e-selectors';

import { PrometheusDatasource } from '../datasource';
import { PrometheusLanguageProviderInterface } from '../language_provider';
import { migrateVariableEditorBackToVariableSupport } from '../migrations/variableMigration';
import { PromVariableQuery, PromVariableQueryType, StandardPromVariableQuery } from '../types';

import { PromVariableQueryEditor, Props, variableMigration } from './VariableQueryEditor';

const refId = 'PrometheusVariableQueryEditor-VariableQuery';

describe('PromVariableQueryEditor', () => {
  let props: Props;

  test('Migrates from standard variable support to custom variable query', () => {
    const query: StandardPromVariableQuery = {
      query: 'label_names()',
      refId: 'StandardVariableQuery',
    };

    const migration: PromVariableQuery = variableMigration(query);

    const expected: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelNames,
      refId: 'PrometheusDatasource-VariableQuery',
    };

    expect(migration).toEqual(expected);
  });

  test('Allows for use of variables to interpolate label names in the label values query type.', () => {
    const query: StandardPromVariableQuery = {
      query: 'label_values($label_name)',
      refId: 'StandardVariableQuery',
    };

    const migration: PromVariableQuery = variableMigration(query);

    const expected: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelValues,
      label: '$label_name',
      refId: 'PrometheusDatasource-VariableQuery',
    };

    expect(migration).toEqual(expected);
  });

  test('Migrates from jsonnet grafana as code variable to custom variable query', () => {
    const query = 'label_names()';

    const migration: PromVariableQuery = variableMigration(query);

    const expected: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelNames,
      refId: 'PrometheusDatasource-VariableQuery',
    };

    expect(migration).toEqual(expected);
  });

  test('Migrates label filters to the query object for label_values()', () => {
    const query: StandardPromVariableQuery = {
      query: 'label_values(metric{label="value"},name)',
      refId: 'StandardVariableQuery',
    };

    const migration: PromVariableQuery = variableMigration(query);

    const expected: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelValues,
      label: 'name',
      metric: 'metric',
      labelFilters: [
        {
          label: 'label',
          op: '=',
          value: 'value',
        },
      ],
      refId: 'PrometheusDatasource-VariableQuery',
    };

    expect(migration).toEqual(expected);
  });

  test('Migrates a query object with label filters to an expression correctly', () => {
    const query: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelValues,
      label: 'name',
      metric: 'metric',
      labelFilters: [
        {
          label: 'label',
          op: '=',
          value: 'value',
        },
      ],
      refId: 'PrometheusDatasource-VariableQuery',
    };

    const migration: string = migrateVariableEditorBackToVariableSupport(query);

    const expected = 'label_values(metric{label="value"},name)';

    expect(migration).toEqual(expected);
  });

  test('Migrates a query object with no metric and only label filters to an expression correctly', () => {
    const query: PromVariableQuery = {
      qryType: PromVariableQueryType.LabelValues,
      label: 'name',
      labelFilters: [
        {
          label: 'label',
          op: '=',
          value: 'value',
        },
      ],
      refId: 'PrometheusDatasource-VariableQuery',
    };

    const migration: string = migrateVariableEditorBackToVariableSupport(query);

    const expected = 'label_values({label="value"},name)';

    expect(migration).toEqual(expected);
  });

  beforeEach(() => {
    props = {
      datasource: {
        hasLabelsMatchAPISupport: () => true,
        languageProvider: {
          start: () => Promise.resolve([]),
          queryLabelKeys: jest.fn().mockResolvedValue(['those']),
          queryLabelValues: jest.fn().mockResolvedValue(['that']),
        } as Partial<PrometheusLanguageProviderInterface>,
        getTagKeys: jest.fn().mockResolvedValue([{ text: 'this', value: 'this', label: 'this' }]),
        getVariables: jest.fn().mockReturnValue([]),
        metricFindQuery: jest.fn().mockResolvedValue([
          {
            text: 'that',
            value: 'that',
            label: 'that',
          },
        ]),
      } as Partial<PrometheusDatasource> as PrometheusDatasource,
      query: {
        refId: 'test',
        query: 'label_names()',
      },
      onRunQuery: () => {},
      onChange: () => {},
      history: [],
    };
  });

  test('Displays a group of function options', async () => {
    render(<PromVariableQueryEditor {...props} />);

    const select = screen.getByLabelText('Query type').parentElement!;
    await userEvent.click(select);

    await waitFor(() => expect(screen.getAllByText('Label names')).toHaveLength(2));
    await waitFor(() => expect(screen.getByText('Label values')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Metrics')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Query result')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Series query')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Classic query')).toBeInTheDocument());
  });

  test('Calls onChange for label_names(match) query', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: '',
      match: 'that',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Label names', { container: document.body }));

    expect(onChange).toHaveBeenCalledWith({
      query: 'label_names(that)',
      refId,
      qryType: 0,
    });
  });

  test('Calls onChange for label_names, label_values, metrics, query result and classic query.', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: '',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Label names', { container: document.body }));
    await waitFor(() => select(screen.getByLabelText('Query type'), 'Label values', { container: document.body }));
    await waitFor(() => select(screen.getByLabelText('Query type'), 'Metrics', { container: document.body }));
    await waitFor(() => select(screen.getByLabelText('Query type'), 'Query result', { container: document.body }));
    await waitFor(() => select(screen.getByLabelText('Query type'), 'Classic query', { container: document.body }));

    expect(onChange).toHaveBeenCalledTimes(5);
  });

  test('Does not call onChange for series query', async () => {
    const onChange = jest.fn();

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Series query', { container: document.body }));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('Calls onChange for metrics() after input', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: 'label_names()',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Metrics', { container: document.body }));
    const metricInput = screen.getByLabelText('Metric selector');
    await userEvent.type(metricInput, 'a');
    const queryType = screen.getByLabelText('Query type');
    // click elsewhere to trigger the onBlur
    await userEvent.click(queryType);

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        query: 'metrics(a)',
        refId,
        qryType: 2,
      })
    );
  });

  test('Calls onChange for label_values() after selecting label', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: 'label_names()',
      qryType: 0,
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Label values', { container: document.body }));
    const labelSelect = screen.getByTestId(
      selectors.components.DataSource.Prometheus.variableQueryEditor.labelValues.labelSelect
    );
    await userEvent.type(labelSelect, 'this');

    await waitFor(() => select(labelSelect, 'this', { container: document.body }));
    //display label in label select
    await waitFor(() => expect(screen.getByText('this')).toBeInTheDocument());

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        query: 'label_values(this)',
        refId,
        qryType: 1,
      })
    );
  });

  test('Calls onChange for label_values() after selecting metric', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: 'label_names()',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    await waitFor(() => select(screen.getByLabelText('Query type'), 'Label values', { container: document.body }));
    const labelSelect = screen.getByTestId(
      selectors.components.DataSource.Prometheus.variableQueryEditor.labelValues.labelSelect
    );
    await userEvent.type(labelSelect, 'this');
    await waitFor(() => select(labelSelect, 'this', { container: document.body }));

    const combobox = screen.getByPlaceholderText('Select metric');
    await userEvent.type(combobox, 'that');
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        query: 'label_values(that,this)',
        refId,
        qryType: 1,
      })
    );
  });

  test('Calls onChange for query_result() with argument onBlur', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: 'query_result(a)',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    const labelSelect = screen.getByLabelText('Prometheus Query');
    await userEvent.click(labelSelect);
    const functionSelect = screen.getByLabelText('Query type').parentElement!;
    await userEvent.click(functionSelect);

    expect(onChange).toHaveBeenCalledWith({
      query: 'query_result(a)',
      refId,
      qryType: 3,
    });
  });

  test('Calls onChange for Match[] series with argument onBlur', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      query: '{a: "example"}',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    const labelSelect = screen.getByLabelText('Series Query');
    await userEvent.click(labelSelect);
    const functionSelect = screen.getByLabelText('Query type').parentElement!;
    await userEvent.click(functionSelect);

    expect(onChange).toHaveBeenCalledWith({
      query: '{a: "example"}',
      refId,
      qryType: 4,
    });
  });

  test('Calls onChange for classic query onBlur', async () => {
    const onChange = jest.fn();

    props.query = {
      refId: 'test',
      qryType: 5,
      query: 'label_values(instance)',
    };

    render(<PromVariableQueryEditor {...props} onChange={onChange} />);

    const labelSelect = screen.getByLabelText('Classic Query');
    await userEvent.click(labelSelect);
    const functionSelect = screen.getByLabelText('Query type').parentElement!;
    await userEvent.click(functionSelect);

    expect(onChange).toHaveBeenCalledWith({
      query: 'label_values(instance)',
      refId,
      qryType: 5,
    });
  });
});
