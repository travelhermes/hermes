mod recommender;

use neon::prelude::*;
use self::recommender::*;

register_module!(mut m, {
    m.export_function("mpipUsers", mpip_users)?;
    m.export_function("cfPrediction", cf_prediction)?;
    m.export_function("cbPrediction", cb_prediction)?;
    Ok(())
});
