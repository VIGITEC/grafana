package apis

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/version"
	apimachineryversion "k8s.io/apimachinery/pkg/version"

	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/tests/testinfra"
	"github.com/grafana/grafana/pkg/tests/testsuite"
)

func TestMain(m *testing.M) {
	testsuite.Run(m)
}

func TestIntegrationOpenAPIs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	h := NewK8sTestHelper(t, testinfra.GrafanaOpts{
		AppModeProduction: true,
		EnableFeatureToggles: []string{
			featuremgmt.FlagQueryService, // Query Library
			featuremgmt.FlagProvisioning,
			featuremgmt.FlagInvestigationsBackend,
			featuremgmt.FlagGrafanaAdvisor,
			featuremgmt.FlagGrafanaAPIServerWithExperimentalAPIs, // all datasources
		},
	})

	t.Run("check valid version response", func(t *testing.T) {
		disco := h.NewDiscoveryClient()
		req := disco.RESTClient().Get().
			Prefix("version").
			SetHeader("Accept", "application/json")

		result := req.Do(context.Background())
		require.NoError(t, result.Error())

		raw, err := result.Raw()
		require.NoError(t, err)
		info := apimachineryversion.Info{}
		err = json.Unmarshal(raw, &info)
		require.NoError(t, err)

		// Make sure the gitVersion is parsable
		v, err := version.Parse(info.GitVersion)
		require.NoError(t, err)
		require.Equal(t, info.Major, fmt.Sprintf("%d", v.Major()))
		require.Equal(t, info.Minor, fmt.Sprintf("%d", v.Minor()))

		// Check that OpenAPI v2 (used by kubectl) returns properly
		v2, err := disco.OpenAPISchema()
		require.NoError(t, err, "requesting OpenAPI v2")
		require.Equal(t, "Grafana API Server", v2.Info.Title)
	})

	dir := "openapi_snapshots"

	var groups = []schema.GroupVersion{{
		Group:   "dashboard.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "dashboard.grafana.app",
		Version: "v1beta1",
	}, {
		Group:   "dashboard.grafana.app",
		Version: "v2alpha1",
	}, {
		Group:   "folder.grafana.app",
		Version: "v1beta1",
	}, {
		Group:   "provisioning.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "iam.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "investigations.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "advisor.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "playlist.grafana.app",
		Version: "v0alpha1",
	}, {
		Group:   "notifications.alerting.grafana.app",
		Version: "v0alpha1",
	}}
	for _, gv := range groups {
		VerifyOpenAPISnapshots(t, dir, gv, h)
	}
}
